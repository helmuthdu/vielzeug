export const roomsPresenceExample = {
  code: `import { createPulse } from '@vielzeug/pulse'

// Room scopes: ref-counted membership with reactive presence
const pulse = createPulse('wss://api.example.com/ws')
const lobby = pulse.room('lobby')

try {
  await pulse.connect()

  // Wait for server confirmation
  await lobby.joined
  console.log('joined lobby, rooms:', [...pulse.rooms.value])

  // Broadcast our own presence
  lobby.updatePresence({ avatar: '/me.png', name: 'Alice', status: 'online' })

  // Reactive presence map: memberId → state
  const printMembers = () => {
    for (const [id, state] of lobby.presence.value) {
      console.log('  ' + id + ': ' + state.name + ' (' + state.status + ')')
    }
  }

  // React to individual joins and leaves
  lobby.onJoin((id, state) => console.log(state.name + ' joined'))
  lobby.onLeave((id) => console.log(id + ' left'))
} catch (err) {
  console.log('connection or room operation failed:', err.message)
}

// Dispose the room scope — sends leave when last scope is released
lobby.dispose()
console.log('rooms after leave:', [...pulse.rooms.value])

pulse.dispose()`,
  name: 'Rooms & Presence',
};
