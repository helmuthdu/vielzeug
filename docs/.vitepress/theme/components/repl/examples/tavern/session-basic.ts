export const sessionBasicExample = {
  code: `import { hostTavern, joinTavern } from '@vielzeug/tavern'

// In-memory WebRTC fake (same shape as the mesh example): tavern pairs over mesh.
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

// The hosted subject: tavern reads snapshot(), re-broadcasts on onChanged, ends on onRemoved.
function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    state: () => state,
    set(next) {
      state = next
      listeners.forEach((f) => f())
    },
    subject: {
      onChanged(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      onRemoved() {
        return () => {}
      },
      snapshot: () => state,
    },
  }
}

const store = createStore({ hp: 20, log: [] })

// The command table is the same code path the host's own UI would call.
const commands = {
  damage: ([amount]) => {
    const s = store.state()
    store.set({ hp: Math.max(0, s.hp - Number(amount)), log: [...s.log, 'hit for ' + amount] })
  },
}

const host = hostTavern({ rtc: fakeRtc, subject: store.subject, commands })
host.tap((e) => {
  if (e.type === 'peer-joined') console.log('host: guest joined', e.peer.id)
})

const invitationCode = await host.createInvitationCode()

const { guest, answerCode, ready } = await joinTavern({
  rtc: fakeRtc,
  invitationCode,
  name: 'Tablet',
  mount: (snapshot) => {
    console.log('guest mounted snapshot:', JSON.stringify(snapshot))
    return snapshot
  },
})

await host.acceptAnswerCode(answerCode)
await ready
console.log('session open, host peers:', host.peers.length)

// Guest commands forward to the host's table; the effect arrives with the next snapshot.
guest.sendCommand('damage', [7])
await new Promise((r) => setTimeout(r, 10))

console.log('host state:', JSON.stringify(store.state()))

guest.dispose()
host.dispose()
console.log('disposed:', guest.disposed, host.disposed)`,
  name: 'Host & Guest Session',
};
