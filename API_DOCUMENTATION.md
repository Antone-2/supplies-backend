# API Documentation - Medhelm Supplies Backend

## Overview
RESTful API for Medhelm Supplies eCommerce platform with comprehensive endpoints for user management, product catalog, orders, and payment processing.

**Base URL**: `https://api.medhelmsupplies.co.ke/api/v1`  
**Authentication**: JWT Bearer tokens  
**Format**: JSON  

## Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePass123",
  "phone": "+254712345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "64abc123def456",
      "name": "John Doe", 
      "email": "john@example.com",
      "phone": "+254712345678"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64abc123def456",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Products

### Get All Products
```http
GET /products?page=1&limit=10&category=medical&search=stethoscope
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `category` (optional): Filter by category ID
- `search` (optional): Search in product name and description
- `sortBy` (optional): Sort field (name, price, createdAt)
- `sortOrder` (optional): asc or desc (default: asc)
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `inStock` (optional): true/false - filter by stock availability

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "64abc123def456",
        "name": "Digital Stethoscope",
        "description": "Professional digital stethoscope with noise cancellation",
        "price": 12500,
        "originalPrice": 15000,
        "currency": "KES",
        "category": {
          "id": "64def456abc789",
          "name": "Diagnostic Equipment",
          "slug": "diagnostic-equipment"
        },
        "subcategory": {
          "id": "64ghi789jkl012",
          "name": "Stethoscopes",
          "slug": "stethoscopes"
        },
        "brand": "MedTech Pro",
        "images": [
          {
            "url": "https://res.cloudinary.com/medhelm/image/upload/v1/products/stethoscope1.jpg",
            "alt": "Digital Stethoscope Front View",
            "isPrimary": true
          }
        ],
        "specifications": {
          "weight": "250g",
          "material": "Aluminum alloy",
          "warranty": "2 years"
        },
        "inventory": {
          "quantity": 25,
          "inStock": true,
          "lowStockThreshold": 5
        },
        "ratings": {
          "average": 4.5,
          "count": 28
        },
        "tags": ["professional", "digital", "medical"],
        "isActive": true,
        "createdAt": "2024-10-01T10:00:00Z",
        "updatedAt": "2024-10-02T14:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get Product Details
```http
GET /products/64abc123def456
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      // Complete product object with all details
      "id": "64abc123def456",
      "name": "Digital Stethoscope",
      // ... all product fields
      "relatedProducts": [
        {
          "id": "64xyz789abc123",
          "name": "Blood Pressure Monitor",
          "price": 8500,
          "image": "https://..."
        }
      ],
      "reviews": [
        {
          "id": "64rev123iew456",
          "user": {
            "name": "Dr. Smith",
            "verified": true
          },
          "rating": 5,
          "comment": "Excellent quality, very accurate",
          "createdAt": "2024-09-28T16:20:00Z"
        }
      ]
    }
  }
}
```

### Create Product (Admin Only)
```http
POST /products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Digital Thermometer",
  "description": "Fast and accurate digital thermometer",
  "price": 2500,
  "originalPrice": 3000,
  "categoryId": "64def456abc789",
  "subcategoryId": "64mno345pqr678",
  "brand": "MedTech",
  "specifications": {
    "accuracy": "±0.1°C",
    "measurement_time": "60 seconds",
    "display": "LCD"
  },
  "inventory": {
    "quantity": 100,
    "lowStockThreshold": 10
  },
  "tags": ["digital", "thermometer", "medical"]
}
```

## Categories

### Get All Categories
```http
GET /categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "64abc123def456",
        "name": "Diagnostic Equipment",
        "slug": "diagnostic-equipment",
        "description": "Professional medical diagnostic tools",
        "image": "https://res.cloudinary.com/medhelm/category/diagnostic.jpg",
        "subcategories": [
          {
            "id": "64sub123def456",
            "name": "Stethoscopes",
            "slug": "stethoscopes",
            "productCount": 15
          }
        ],
        "productCount": 45,
        "isActive": true
      }
    ]
  }
}
```

## Shopping Cart

### Get Cart
```http
GET /cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "64cart123def456",
      "userId": "64user123def456",
      "items": [
        {
          "id": "64item123def456",
          "product": {
            "id": "64prod123def456",
            "name": "Digital Stethoscope",
            "price": 12500,
            "image": "https://..."
          },
          "quantity": 2,
          "unitPrice": 12500,
          "totalPrice": 25000
        }
      ],
      "summary": {
        "subtotal": 25000,
        "tax": 2500,
        "shipping": 500,
        "discount": 1000,
        "total": 27000
      },
      "itemCount": 2,
      "updatedAt": "2024-10-02T14:30:00Z"
    }
  }
}
```

### Add to Cart
```http
POST /cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "64prod123def456",
  "quantity": 2
}
```

### Update Cart Item
```http
PUT /cart/update/64item123def456
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart
```http
DELETE /cart/remove/64item123def456
Authorization: Bearer <token>
```

## Orders

### Create Order
```http
POST /orders/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "64prod123def456",
      "quantity": 2,
      "price": 12500
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "+254712345678",
    "email": "john@example.com",
    "street": "123 Main Street",
    "city": "Nairobi",
    "state": "Nairobi County",
    "zipCode": "00100",
    "country": "Kenya"
  },
  "paymentMethod": "pesapal",
  "notes": "Please deliver during business hours"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "64order123def456",
      "orderId": "ORD-2024-001234",
      "status": "pending_payment",
      "items": [
        {
          "product": {
            "id": "64prod123def456",
            "name": "Digital Stethoscope",
            "image": "https://..."
          },
          "quantity": 2,
          "unitPrice": 12500,
          "totalPrice": 25000
        }
      ],
      "summary": {
        "subtotal": 25000,
        "tax": 2500,
        "shipping": 500,
        "total": 28000
      },
      "shippingAddress": {
        "fullName": "John Doe",
        "phone": "+254712345678",
        "street": "123 Main Street",
        "city": "Nairobi",
        "country": "Kenya"
      },
      "createdAt": "2024-10-02T14:30:00Z",
      "estimatedDelivery": "2024-10-05T14:30:00Z"
    }
  }
}
```

### Get Order Details
```http
GET /orders/64order123def456
Authorization: Bearer <token>
```

### Get User Orders
```http
GET /orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: pending, processing, shipped, delivered, cancelled
- `page`: Page number
- `limit`: Items per page

## Payment

### Initiate PesaPal Payment
```http
POST /payment/pesapal
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "64order123def456",
  "amount": 28000,
  "currency": "KES",
  "description": "Order payment for medical equipment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentUrl": "https://cybqa.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest",
    "orderTrackingId": "pesapal-track-123456",
    "orderId": "64order123def456",
    "amount": 28000,
    "currency": "KES"
  }
}
```

### Check Payment Status
```http
GET /payment/status/64order123def456
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "orderId": "64order123def456",
      "status": "completed",
      "amount": 28000,
      "currency": "KES",
      "transactionId": "pesapal-txn-789012",
      "paidAt": "2024-10-02T14:45:00Z",
      "paymentMethod": "M-Pesa"
    }
  }
}
```

## User Profile

### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "+254712345679",
  "addresses": [
    {
      "type": "home",
      "fullName": "John Smith",
      "phone": "+254712345679",
      "street": "456 Oak Avenue",
      "city": "Nairobi",
      "zipCode": "00100",
      "country": "Kenya",
      "isDefault": true
    }
  ]
}
```

## Wishlist

### Get Wishlist
```http
GET /wishlist
Authorization: Bearer <token>
```

### Add to Wishlist
```http
POST /wishlist/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "64prod123def456"
}
```

### Remove from Wishlist
```http
DELETE /wishlist/remove/64prod123def456
Authorization: Bearer <token>
```

## Admin Endpoints

### Get All Orders (Admin)
```http
GET /admin/orders?page=1&limit=20&status=all
Authorization: Bearer <admin-token>
```

### Update Order Status (Admin)
```http
PUT /admin/orders/64order123def456/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRK123456789",
  "notes": "Package shipped via courier"
}
```

### Get Analytics (Admin)
```http
GET /admin/analytics?period=30d
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 2580000,
      "totalOrders": 156,
      "averageOrderValue": 16538,
      "conversionRate": 3.2
    },
    "charts": {
      "dailyRevenue": [
        {"date": "2024-10-01", "revenue": 45000},
        {"date": "2024-10-02", "revenue": 52000}
      ],
      "topProducts": [
        {"name": "Digital Stethoscope", "sales": 25, "revenue": 312500}
      ]
    }
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "requestId": "req-123456789"
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Invalid/missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Duplicate resource)
- `429` - Too Many Requests (Rate limited)
- `500` - Internal Server Error

## Rate Limiting

Different endpoints have different rate limits:

- **Authentication**: 10 requests per 15 minutes
- **Payment**: 5 requests per 5 minutes  
- **General API**: 100 requests per 15 minutes
- **Admin**: 200 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

## Webhooks

### PesaPal Payment Webhook
```http
POST /payment/callback
Content-Type: application/json

{
  "OrderTrackingId": "pesapal-track-123456",
  "OrderNotificationType": "COMPLETED",
  "OrderMerchantReference": "64order123def456"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const MedhelmAPI = require('medhelm-api-client');

const client = new MedhelmAPI({
  baseUrl: 'https://api.medhelmsupplies.co.ke/api/v1',
  apiKey: 'your-api-key'
});

// Get products
const products = await client.products.getAll({
  category: 'diagnostic-equipment',
  limit: 10
});

// Create order
const order = await client.orders.create({
  items: [{ productId: '64abc123', quantity: 2 }],
  shippingAddress: { /* address object */ }
});
```

### Python
```python
import requests

class MedhelmAPI:
    def __init__(self, api_key):
        self.base_url = 'https://api.medhelmsupplies.co.ke/api/v1'
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def get_products(self, **params):
        response = requests.get(f'{self.base_url}/products', 
                             headers=self.headers, params=params)
        return response.json()

# Usage
api = MedhelmAPI('your-jwt-token')
products = api.get_products(category='medical', limit=10)
```

## Testing

### Health Check
```bash
curl https://api.medhelmsupplies.co.ke/api/health
```

### Authentication Test
```bash
curl -X POST https://api.medhelmsupplies.co.ke/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

This API documentation provides comprehensive coverage of all available endpoints with request/response examples for easy integration.