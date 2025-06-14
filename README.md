# Browser OS (AOS)

A modern web-based operating system interface built with React and Node.js.

## Features

- Modern desktop-like interface
- File management system
- Real-time chat with video capabilities
- Music player
- Drag and drop file uploads
- User authentication

## Tech Stack

### Frontend
- React
- Vite
- Socket.IO Client
- Axios
- Framer Motion
- Zustand (State Management)
- React Router DOM

### Backend
- Node.js
- Express
- Socket.IO
- MySQL
- Multer (File Upload)

## Development Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd AOS
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
   - Create `.env` files in both frontend and backend directories
   - See `.env.example` files for required variables

4. Start development servers:
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

## Production Deployment

The application is deployed on Vercel:
- Frontend: https://browser-os-aos-bsis.vercel.app
- Backend: [Your backend Vercel URL]

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=your_backend_url
```

### Backend (.env)
```
PORT=5000
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 