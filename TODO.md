# Payment APIs Implementation Plan

## Steps to Complete:

1. **Update .env for local PesaPal testing**
   - Set `PESAPAL_TEST_MODE=true`
   - Set `PESAPAL_CALLBACK_URL=

2. **Implement real PesaPal integration in src/services/pesapalService.js**
   - Add function to get OAuth token using consumer key/secret.
   - Add function to get IPN notification ID.
   - Add function to submit order (orderId, amount, description, callbackUrl) and return payment URL.

3. **Update src/modules/payment/payment.controller.js**
   - Update `createPesapalPayment` to use `pesapalService.initiatePesapalPayment` with validation and error handling.
   - Implement basic M-Pesa integration using Safaricom Daraja API (get token, STK push).
   - Mock `/airtel` and `/paypal` for now (return success with orderId).
   - Update `paymentCallback` to handle PesaPal IPN (verify notification, update order status in DB).

4. **Verify and update dependent files**
   - Check `src/routes/index.js` to ensure `/api/v1/payments` mounts `paymentRoutes`.
   - Update `Database/models/order.model.js` to add `paymentStatus` field if missing (e.g., enum: ['pending', 'paid', 'failed']).

5. **Test payment APIs**
   - Restart server: `cd eCommerce-Backend && npm run start`
   - Test PesaPal initiation: `curl -X POST http://localhost:5000/api/v1/payments/pesapal -H "Content-Type: application/json" -d '{"orderId":"test123","amount":100,"phone":"+254712345678","email":"test@example.com"}'` (expect real payment URL in response).
   - Test M-Pesa: Similar curl to `/mpesa` (expect STK push response).
   - Simulate callback: `curl -X POST http://localhost:5000/api/payments/callback -H "Content-Type: application/json" -d '{"notification_type":"IPN","order_id":"test123","status":"COMPLETED"}'` (check server logs for order update).
   - Verify no errors in server logs; confirm order status updates in MongoDB.

## Progress Tracking:
- [x] Step 1: Update .env
- [x] Step 2: Update pesapalService.js
- [x] Step 3: Update payment.controller.js
- [x] Step 4: Verify dependent files
- [ ] Step 5: Test payment APIs
