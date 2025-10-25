# HNG Task 2 - Country Currency & Exchange API

A RESTful API built with Express.js, MongoDB, and Mongoose that fetches country data from external APIs, calculates estimated GDP, and provides comprehensive CRUD operations with filtering, sorting, and image generation.

## 🌟 Features

- 🌍 Fetch real-time country data from restcountries.com
- 💱 Fetch exchange rates from open.er-api.com
- 💰 Calculate estimated GDP for each country
- 🗄️ Cache data in MongoDB for fast retrieval
- 🖼️ Generate summary images with top countries
- 🔍 Filter by region and currency
- 📊 Sort by GDP (ascending/descending)
- ⚡ Case-insensitive country search

## 🛠️ Tech Stack

- **Node.js** (ES6 modules)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Jimp** - Image generation
- **node-fetch** - HTTP requests
- **dotenv** - Environment configuration
- **Sharp** - Image processing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/izuchukwuMcGibson/HNG-Task-2.git
cd HNG-Task-2
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the root directory:
```env
MONGO_URI=mongodb://localhost:27017/countries_db
PORT=3000
```

4. **Start MongoDB:**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud connection string in .env
```

5. **Run the application:**
```bash
# Production mode
npm start

# Development mode (with nodemon)
npm run dev
```

The API will be available at `http://localhost:3000`

## 📡 API Endpoints

### 1. Refresh Country Data
Fetch fresh data from external APIs and cache in database.

```http
POST /countries/refresh
```

**Response:**
```json
{
  "message": "Refresh successful",
  "total_updated_or_inserted": 250,
  "last_refreshed_at": "2025-10-25T10:39:39Z"
}
```

**Error (503):**
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from restcountries.com"
}
```

---

### 2. Get All Countries
Retrieve cached countries with optional filters and sorting.

```http
GET /countries
```

**Query Parameters:**
- `region` - Filter by region (e.g., `Africa`, `Europe`, `Asia`)
- `currency` - Filter by currency code (e.g., `NGN`, `USD`, `GBP`)
- `sort` - Sort by GDP (`gdp_desc` or `gdp_asc`)

**Examples:**
```bash
# Get all countries
GET /countries

# Filter by region
GET /countries?region=Africa

# Filter by currency
GET /countries?currency=NGN

# Sort by GDP descending
GET /countries?sort=gdp_desc

# Combine filters
GET /countries?region=Africa&sort=gdp_desc
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 257674481.25,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-25T10:39:39Z"
  }
]
```

---

### 3. Get Country by Name
Retrieve a single country (case-insensitive).

```http
GET /countries/:name
```

**Examples:**
```bash
GET /countries/Nigeria
GET /countries/nigeria
GET /countries/NIGERIA
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139589,
  "currency_code": "NGN",
  "exchange_rate": 1600.23,
  "estimated_gdp": 257674481.25,
  "flag_url": "https://flagcdn.com/ng.svg",
  "last_refreshed_at": "2025-10-25T10:39:39Z"
}
```

**Error (404):**
```json
{
  "error": "Country not found"
}
```

---

### 4. Delete Country
Remove a country from the database (case-insensitive).

```http
DELETE /countries/:name
```

**Response:**
```json
{
  "message": "Country deleted"
}
```

---

### 5. Get Status
Get system status with total countries and last refresh time.

```http
GET /status
```

**Response:**
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-25T10:39:39Z"
}
```

---

### 6. Get Summary Image
Retrieve the auto-generated summary image.

```http
GET /countries/image
```

**Response:**
Returns a PNG image showing:
- Total number of countries
- Top 5 countries by estimated GDP
- Last refresh timestamp

**Error (404):**
```json
{
  "error": "Summary image not found"
}
```

---

## 📊 Data Model

### Country Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | ObjectId | Auto | MongoDB ID |
| `name` | String | Yes | Country name |
| `nameLower` | String | Auto | Lowercase name for case-insensitive search |
| `capital` | String | No | Capital city |
| `region` | String | No | Geographic region |
| `population` | Number | Yes | Population count |
| `currency_code` | String | No* | Currency code (null if no currency) |
| `exchange_rate` | Number | No* | Exchange rate to USD (null if not found) |
| `estimated_gdp` | Number | No* | Calculated GDP (null/0 based on data) |
| `flag_url` | String | No | Flag image URL |
| `last_refreshed_at` | Date | Auto | Last update timestamp |

*Note: These fields can be null based on data availability.

---

## 🧮 Business Logic

### Estimated GDP Calculation
```
estimated_gdp = population × random(1000–2000) ÷ exchange_rate
```

### Currency Handling Rules

1. **Multiple currencies:** Use only the first currency from the array
2. **No currencies:** Set `currency_code` and `exchange_rate` to `null`, `estimated_gdp` to `0`
3. **Currency not in exchange API:** Set `exchange_rate` to `null`, `estimated_gdp` to `null`
4. **Always store the country** regardless of currency availability

### Refresh Behavior

- **Update vs Insert:** Match by country name (case-insensitive)
- **Random multiplier:** Generate fresh (1000-2000) for each country on every refresh
- **Atomic operation:** All countries updated/inserted in a single bulk operation
- **Failure handling:** If external API fails, return 503 and DO NOT modify database

---

## ⚠️ Error Handling

The API returns consistent JSON error responses:

| Status Code | Error Type | Example Response |
|-------------|------------|------------------|
| 400 | Bad Request | `{ "error": "Validation failed", "details": { "currency_code": "is required" } }` |
| 404 | Not Found | `{ "error": "Country not found" }` |
| 500 | Server Error | `{ "error": "Internal server error" }` |
| 503 | Service Unavailable | `{ "error": "External data source unavailable", "details": "..." }` |

---

## 🌐 External APIs

1. **Countries API**
   - URL: `https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies`
   - Purpose: Fetch country data

2. **Exchange Rates API**
   - URL: `https://open.er-api.com/v6/latest/USD`
   - Purpose: Fetch currency exchange rates (relative to USD)

---

## 🧪 Testing with cURL

```bash
# 1. Refresh data
curl -X POST http://localhost:3000/countries/refresh

# 2. Get all countries
curl http://localhost:3000/countries

# 3. Filter by region
curl http://localhost:3000/countries?region=Africa

# 4. Filter by currency
curl http://localhost:3000/countries?currency=NGN

# 5. Sort by GDP (descending)
curl http://localhost:3000/countries?sort=gdp_desc

# 6. Get specific country
curl http://localhost:3000/countries/Nigeria

# 7. Delete country
curl -X DELETE http://localhost:3000/countries/Nigeria

# 8. Get status
curl http://localhost:3000/status

# 9. Get summary image
curl http://localhost:3000/countries/image -o summary.png
```

---

## 📁 Project Structure

```
HNG-Task-2/
├── src/
│   ├── controllers/
│   │   └── countriesController.js    # Business logic
│   ├── models/
│   │   ├── Country.js                # Country schema
│   │   └── Meta.js                   # Metadata schema
│   ├── routes/
│   │   ├── countries.js              # Country routes
│   │   └── status.js                 # Status routes
│   └── utils/
│       └── image.js                  # Image generation
├── scripts/                          # Utility scripts
├── cache/                            # Generated images
├── index.js                          # Application entry point
├── package.json                      # Dependencies
├── .gitignore                        # Git ignore rules
└── .env                              # Environment variables
```

---

## 🔧 Environment Variables

```env
# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/countries_db

# Or use MongoDB Atlas
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/countries_db

# Server port
PORT=3000
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### Port Already in Use
Change the `PORT` in your `.env` file:
```env
PORT=4000
```

### External API Timeout
- Check your internet connection
- Verify the external API URLs are accessible
- Try again after a few moments

### Image Generation Fails
Ensure the `cache` directory exists:
```bash
mkdir cache
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👤 Author

**Izuchukwu McGibson**
- GitHub: [@izuchukwuMcGibson](https://github.com/izuchukwuMcGibson)

---

## 🙏 Acknowledgments

- [REST Countries API](https://restcountries.com/)
- [Exchange Rates API](https://open.er-api.com/)
- HNG Internship Program

---

**Built with ❤️ for HNG Task 2**

---

## 🔗 Links

- [Repository](https://github.com/izuchukwuMcGibson/HNG-Task-2)
- [Issues](https://github.com/izuchukwuMcGibson/HNG-Task-2/issues)

---

**Happy Coding! 🚀**
