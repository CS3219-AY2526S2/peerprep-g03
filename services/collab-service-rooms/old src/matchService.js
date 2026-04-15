// import { waitingUser, matches, nextUserId, nextRoomId } from './store.js'

// export function joinMatch() {
//   const userId = nextUserId()
//   console.log('New join request:', userId)

//   // No one waiting yet -> this user becomes the waiting user
//   if (!waitingUser.userId) {
//     waitingUser.userId = userId

//     matches.set(userId, {
//       status: 'waiting',
//       roomId: null,
//       partnerId: null,
//     })

//     console.log(`${userId} is now waiting`)

//     return {
//       userId,
//       status: 'waiting',
//       roomId: null,
//       partnerId: null,
//     }
//   }

//   // Someone is already waiting -> pair them now
//   const firstUserId = waitingUser.userId
//   const secondUserId = userId
//   const roomId = nextRoomId()

//   matches.set(firstUserId, {
//     status: 'matched',
//     roomId,
//     partnerId: secondUserId,
//   })

//   matches.set(secondUserId, {
//     status: 'matched',
//     roomId,
//     partnerId: firstUserId,
//   })

//   waitingUser.userId = null

//   console.log(`Matched ${firstUserId} with ${secondUserId} in ${roomId}`)

//   return {
//     userId: secondUserId,
//     status: 'matched',
//     roomId,
//     partnerId: firstUserId,
//   }
// }

// export function getStatus(userId) {
//   const match = matches.get(userId)
//   console.log('Status check for:', userId, match)

//   if (!match) {
//     return null
//   }

//   return {
//     userId,
//     ...match,
//   }
// }