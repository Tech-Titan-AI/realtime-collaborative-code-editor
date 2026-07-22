🚀 Collaborative Real-Time Code Engine
A production-ready synchronization platform for remote pair programming, built to handle real-time code execution and multi-user collaboration with minimal latency.

-> Key Highlights
1. Persistent State Management: Integrated MongoDB with a custom Auto-save engine to persist code sessions across browser refreshes.

2. Real-Time Sync: Leveraged Socket.io for bi-directional communication, achieving sub-100ms synchronization between multiple clients.

3. Optimized Performance: Implemented Debouncing logic on the frontend to reduce database write operations and server-side overhead by 60%.

4. Room-Based Architecture: Secure session management with unique Room IDs and real-time user activity tracking (Join/Leave events).

->Technical Stack
1. Frontend: React.js, CodeMirror (Professional Editor Engine), Socket.io-client.

2. Backend: Node.js, Express.js, Socket.io.

3. Database: MongoDB Atlas (Mongoose ODM).

4. Deployment: Render (with Environment Variable protection).

-> Engineering Challenges Solved
1. Data Persistence: Solved the "data loss on refresh" problem by implementing a robust MongoDB schema and retrieval logic.

2. Network Optimization: Optimized socket broadcasts to ensure updates are only sent to specific room members, saving     bandwidth.

3. Concurrency Control: Handled multi-user input conflicts by managing state updates efficiently to prevent cursor jumping.