export const roomsPresenceExample = {
  code: `import { createPulse } from '@vielzeug/pulse'

// Reactive presence channel — implicitly joins 'lobby'
const pulse = createPulse('wss://api.example.com/ws')
const lobby = pulse.presence('lobby')

// Subscribe to state changes manually (state.value is a ReadonlyMap)
const printMembers = () => {
  for (const [id, state] of lobby.state.value) {
    console.log('  ' + id + ': ' + state.name + ' (' + state.status + ')')
  }
}

// React to individual joins and leaves
lobby.onJoin((id, state) => console.log(state.name + ' joined'))
lobby.onLeave((id) => console.log(id + ' left'))

// Broadcast our own presence
lobby.update({ avatar: '/me.png', name: 'Alice', status: 'online' })

// Explicit room management (join resolves on server confirmation)
try {
  await pulse.join('game-room')
  console.log('rooms:', [...pulse.rooms.value])
  await pulse.leave('game-room')
  console.log('rooms after leave:', [...pulse.rooms.value])
} catch (err) {
  console.log('room op failed:', err.message)
}

lobby.dispose()
pulse.dispose()`,
  name: 'Rooms & Presence',
};
