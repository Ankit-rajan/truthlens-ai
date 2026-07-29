

## 📄 1. `README.md` – Complete Project Documentation

```markdown
# TruthLens - AI Powered Fake News Detection Platform

![TruthLens Banner](https://via.placeholder.com/1200x400/6c5ce7/ffffff?text=TruthLens)

TruthLens is a production-ready MERN stack application that uses AI to detect fake news, analyze misinformation, and provide fact-checking with confidence scores.

## 🚀 Features

### Core Features
- **AI-Powered Analysis** – Uses OpenAI/Gemini to analyze news articles
- **Fact Checking** – Cross-references with trusted sources (Reuters, BBC, Wikipedia, etc.)
- **Source Analysis** – Domain reputation, SSL, blacklist, spam score
- **Multiple Verdicts** – Fake, Likely Fake, Partially True, True
- **Confidence Scoring** – 0-100% confidence with visual progress bars
- **Detailed Reports** – Reasons, evidence, bias, emotional tone, clickbait score

### User Features
- **JWT Authentication** – Secure login/signup with email verification
- **Password Reset** – Forgot password with email reset link
- **User Dashboard** – Profile, history, bookmarks, analytics
- **History Management** – Search, filter, sort, delete analyses
- **PDF Reports** – Download analysis reports as PDF
- **CSV Export** – Export entire history as CSV
- **Dark/Light Mode** – Toggle between themes

### Admin Features
- **Admin Dashboard** – Total users, analyses, trending news
- **User Management** – View and delete users
- **Report Management** – Delete reports
- **Trending News** – Add and delete trending fake news
- **Analytics** – Monthly activity charts, prediction breakdown

### Security Features
- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- XSS protection via xss and sanitize-html
- MongoDB sanitization
- CSRF protection
- JWT with HTTP-only cookies
- Password hashing with bcryptjs
- Input validation

## 🛠️ Tech Stack

### Frontend
- HTML5 / CSS3
- Bootstrap 5
- Vanilla JavaScript
- EJS Template Engine
- Chart.js for analytics
- AOS for scroll animations

### Backend
- Node.js
- Express.js
- MVC Architecture

### Database
- MongoDB
- Mongoose ODM

### AI & APIs
- OpenAI API (GPT-4) OR Google Gemini API
- Fact-checking API integration

### Storage
- Multer for file uploads
- Cloudinary (optional) for image hosting

### Authentication
- JWT (JSON Web Tokens)
- bcryptjs for password hashing
- Nodemailer for emails

## 📁 Project Structure

```
truthlens/
├── config/               # Database, Cloudinary, Email config
├── controllers/          # Business logic
│   ├── authController.js
│   ├── newsController.js
│   ├── trendingController.js
│   └── adminController.js
├── middleware/           # Auth, upload, rate limiter, sanitize, error handler
├── models/              # Mongoose models (User, NewsHistory, TrendingNews, Report, Category)
├── routes/              # API and view routes
│   ├── authRoutes.js
│   ├── newsRoutes.js
│   ├── adminRoutes.js
│   ├── trendingRoutes.js
│   └── viewRoutes.js
├── services/            # AI, fact-check, source analysis, email, PDF
│   ├── aiService.js
│   ├── factCheckService.js
│   ├── sourceAnalysisService.js
│   ├── emailService.js
│   └── pdfGenerator.js
├── utils/               # Helpers & validators
├── views/               # EJS templates
│   ├── partials/        # Navbar, footer
│   ├── admin/           # Admin dashboard, users, trending
│   └── *.ejs            # All pages
├── public/              # Static assets (CSS, JS, images)
├── uploads/             # Uploaded files and reports
├── app.js               # Express app configuration
├── server.js            # Entry point
├── package.json         # Dependencies
├── .env.example         # Environment variables template
└── README.md            # This file
```

## ⚙️ Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- OpenAI API key OR Gemini API key

### Step-by-Step Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/truthlens.git
cd truthlens
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/truthlens
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=sk-...
# OR
GEMINI_API_KEY=your_gemini_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@truthlens.com
ADMIN_PASSWORD=securepassword
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

4. **Run the application**
```bash
npm start
# OR with nodemon for development
npm run dev
```

5. **Access the application**
Open your browser and go to `http://localhost:5000`

## 🔑 Default Admin Account
After running the app, you can create an admin account via:
- Sign up with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`
- OR manually update role in MongoDB

## 🧪 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/forgot-password` | Send reset link |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/verify-email` | Verify email |

### News Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/news/detect` | Analyze news article |
| GET | `/api/news/history` | Get user history |
| DELETE | `/api/news/history/:id` | Delete history entry |
| POST | `/api/news/bookmark/:id` | Toggle bookmark |
| GET | `/api/news/report/:id` | Download PDF report |
| GET | `/api/news/history/export` | Export CSV |

### Trending News
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trending` | Get trending news |
| GET | `/api/trending/:id` | Get single trending |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/users` | Get all users |
| DELETE | `/api/admin/users/:id` | Delete user |
| DELETE | `/api/admin/reports/:id` | Delete report |
| GET | `/api/admin/analytics` | Monthly analytics |
| POST | `/api/admin/trending` | Add trending news |
| DELETE | `/api/admin/trending/:id` | Delete trending |

## 🎨 UI Features

- **Glassmorphism Design** – Modern, frosted glass UI
- **Dark/Light Mode** – User preference saved in localStorage
- **Responsive** – Works on all devices
- **Smooth Animations** – AOS scroll animations
- **Loading Skeletons** – Visual feedback during API calls
- **Charts** – Chart.js for analytics
- **Toast Notifications** – SweetAlert2
- **Progress Bars** – Confidence visual indicators

## 🤖 AI Integration

### OpenAI (GPT-4)
```javascript
// services/aiService.js
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  response_format: { type: "json_object" }
});
```

### Google Gemini
```javascript
// services/aiService.js
const response = await axios.post(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
  { contents: [{ parts: [{ text: prompt }] }] }
);
```

### AI Response Format
```json
{
  "summary": "...",
  "verdict": "Fake | Likely Fake | Partially True | True",
  "confidence": 85,
  "reasons": ["...", "..."],
  "claims": ["...", "..."],
  "evidence": ["...", "..."],
  "bias": "Left | Right | Neutral",
  "emotionalTone": "Angry | Happy | Neutral",
  "clickbaitScore": 72,
  "factConsistency": "High | Medium | Low",
  "misleadingStatements": ["...", "..."],
  "hallucinationProbability": 12
}
```

## 📦 Dependencies

### Production
- `axios` – HTTP requests
- `bcryptjs` – Password hashing
- `cloudinary` – Image upload
- `csurf` – CSRF protection
- `dotenv` – Environment variables
- `ejs` – Template engine
- `express` – Web framework
- `express-rate-limit` – Rate limiting
- `express-session` – Session management
- `express-validator` – Input validation
- `helmet` – Security headers
- `jsonwebtoken` – JWT authentication
- `mongoose` – MongoDB ODM
- `multer` – File uploads
- `nodemailer` – Email sending
- `openai` – OpenAI API
- `pdfkit` – PDF generation
- `sanitize-html` – HTML sanitization
- `validator` – Validation library
- `xss` – XSS protection

### Development
- `nodemon` – Auto-reload during development

## 🚀 Deployment

### Option 1: Render
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set environment variables
5. Deploy

### Option 2: Railway
```bash
railway init
railway up
```

### Option 3: Manual (VPS)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name truthlens
pm2 save
pm2 startup
```

### Option 4: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
docker build -t truthlens .
docker run -p 5000:5000 --env-file .env truthlens
```

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | Token expiry (e.g., 7d) | No |
| `OPENAI_API_KEY` | OpenAI API key | Optional* |
| `GEMINI_API_KEY` | Gemini API key | Optional* |
| `EMAIL_USER` | Gmail address for emails | Yes |
| `EMAIL_PASS` | Gmail app password | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | No |
| `ADMIN_EMAIL` | Default admin email | No |
| `ADMIN_PASSWORD` | Default admin password | No |

\* At least one AI provider is required.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [OpenAI](https://openai.com/) for GPT-4 API
- [Google Gemini](https://deepmind.google/technologies/gemini/) for Gemini API
- [Bootstrap](https://getbootstrap.com/) for UI components
- [Chart.js](https://www.chartjs.org/) for charts
- [Font Awesome](https://fontawesome.com/) for icons
- All the fact-checking organizations (Reuters, BBC, AP News, etc.)

## 📧 Contact

- **Website:** [https://truthlens.com](https://truthlens.com)
- **Email:** support@truthlens.com
- **Twitter:** @TruthLensAI
- **GitHub:** [github.com/truthlens](https://github.com/truthlens)

---

**TruthLens – Restoring trust in information, one article at a time.** 🕵️‍♂️✨
```
