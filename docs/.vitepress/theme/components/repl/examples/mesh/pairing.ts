export const pairingExample = {
  code: `import { createMeshGuest, createMeshHost, meshCodec } from '@vielzeug/mesh'

// In-memory WebRTC fake — the same 'rtc' injection point the package's own
// tests use. In a real app, omit 'rtc' and globalThis.RTCPeerConnection is used.
const fakeRtc = (() => {
  const links = new Map()
  const bag = () => {
    const ls = new Map()
    return {
      addEventListener: (t, f) => ls.set(t, [...(ls.get(t) ?? []), f]),
      removeEventListener: (t, f) => ls.set(t, (ls.get(t) ?? []).filter((x) => x !== f)),
      emit: (t, e = {}) => (ls.get(t) ?? []).forEach((f) => f(e)),
    }
  }
  const channel = () =>
    Object.assign(bag(), {
      readyState: 'connecting',
      remote: null,
      send(data) {
        if (this.remote?.readyState === 'open') queueMicrotask(() => this.remote.emit('message', { data }))
      },
      open() {
        this.readyState = 'open'
        this.emit('open')
      },
      close() {
        if (this.readyState === 'closed') return
        this.readyState = 'closed'
        this.emit('close')
        this.remote?.close()
      },
    })
  const pc = (token) =>
    Object.assign(bag(), {
      connectionState: 'new',
      iceConnectionState: 'new',
      iceGatheringState: 'new',
      localDescription: null,
      createDataChannel() {
        this.dc = channel()
        return this.dc
      },
      createOffer() {
        links.set(token, { host: this })
        return Promise.resolve({ sdp: 'offer:' + token, type: 'offer' })
      },
      createAnswer() {
        const link = [...links.values()].find((l) => l.guest === this)
        return Promise.resolve({ sdp: 'answer:' + link.hostToken + ':' + token, type: 'answer' })
      },
      setLocalDescription(d) {
        this.localDescription = d
        this.iceGatheringState = 'complete'
        return Promise.resolve()
      },
      setRemoteDescription(d) {
        if (d.type === 'offer') {
          // sdp is CRLF-normalized like a real description — trim the token
          const hostToken = d.sdp.split(':')[1].trim()
          const link = links.get(hostToken)
          link.guest = this
          link.hostToken = hostToken
          return Promise.resolve()
        }
        const hostToken = d.sdp.replace('answer:', '').split(':')[0].trim()
        const link = links.get(hostToken)
        const guestChannel = channel()
        const hostChannel = link.host.dc
        hostChannel.remote = guestChannel
        guestChannel.remote = hostChannel
        link.guest.emit('datachannel', { channel: guestChannel })
        queueMicrotask(() => {
          hostChannel.open()
          guestChannel.open()
        })
        return Promise.resolve()
      },
      close() {
        this.dc?.close()
      },
    })
  let n = 0
  return { createPeerConnection: () => pc('pc' + ++n) }
})()

const host = createMeshHost({ rtc: fakeRtc })
const guest = createMeshGuest({ rtc: fakeRtc })

guest.on('ack', (m) => console.log('guest got ack:', m.payload.ok, 'from', m.peerId))
host.on('note', (m) => {
  console.log('host got note:', m.payload)
  host.send(m.peerId, 'ack', { ok: true })
})

// The out-of-band legs are plain strings — copy/paste or navigator.share
const invitationText = meshCodec.encode(await host.createInvitation())
console.log('invitation bytes:', invitationText.length)

const answerText = meshCodec.encode(await guest.acceptInvitation(meshCodec.decode(invitationText)))
const peer = await host.acceptAnswer(meshCodec.decode(answerText))

console.log('paired — host sees peer', peer.id, '| status:', host.status, '/', guest.status)

guest.send('note', 'hello over the fake channel')
await new Promise((r) => setTimeout(r, 0))

host.dispose()
guest.dispose()
console.log('disposed:', host.status, '/', guest.status)`,
  name: 'Pairing & Messaging',
};
