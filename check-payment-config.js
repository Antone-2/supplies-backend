require('dotenv').config();

console.log('🏦 PAYMENT CONFIGURATION ANALYSIS\n');

// Check PesaPal Configuration
console.log('📋 Current PesaPal Settings:');
console.log('─'.repeat(40));

const pesapalConfig = {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY ? '✅ Set' : '❌ Missing',
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET ? '✅ Set' : '❌ Missing',
    testMode: process.env.PESAPAL_TEST_MODE || 'Not Set',
    callbackUrl: process.env.PESAPAL_CALLBACK_URL || 'Using Default',
    redirectUrl: process.env.PESAPAL_REDIRECT_URL || 'Using Default',
    cancelUrl: process.env.PESAPAL_CANCEL_URL || 'Using Default'
};

Object.entries(pesapalConfig).forEach(([key, value]) => {
    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`   ${formattedKey}: ${value}`);
});

console.log('\n🔧 CONFIGURATION STATUS:');
console.log('─'.repeat(40));

// Determine current mode
const isTestMode = process.env.PESAPAL_TEST_MODE === 'true';
const apiUrl = isTestMode
    ? (process.env.PESAPAL_SANDBOX_URL)
    : (process.env.PESAPAL_PRODUCTION_URL);

console.log(`   Mode: ${isTestMode ? '🧪 TEST MODE' : '🚀 PRODUCTION MODE'}`);
console.log(`   API URL: ${apiUrl}`);

console.log('\n💡 TO UPDATE YOUR REAL PAYMENT DETAILS:\n');

if (isTestMode) {
    console.log('🟡 CURRENTLY IN TEST MODE:');
    console.log('   • Payment details shown (220222, 92279474) are PesaPal test details');
    console.log('   • These are NOT your real business details');
    console.log('   • Customers will see PesaPal test M-PESA numbers\n');

    console.log('🔄 TO SWITCH TO REAL PAYMENTS:');
    console.log('   1. Login to your PesaPal merchant dashboard');
    console.log('   2. Update your business profile with real M-PESA details');
    console.log('   3. Set PESAPAL_TEST_MODE=false in your .env file');
    console.log('   4. Restart your server');
    console.log('   5. Test with small amount first\n');
} else {
    console.log('🟢 CURRENTLY IN PRODUCTION MODE:');
    console.log('   • Using live PesaPal API');
    console.log('   • Payment details should be your real business details');
    console.log('   • If showing wrong details, update in PesaPal dashboard\n');
}

console.log('🏦 WHERE TO UPDATE PAYMENT DETAILS:');
console.log('─'.repeat(40));
console.log('   1. PesaPal Merchant Dashboard (PRIMARY)');
console.log('      → https://www.pesapal.com/');
console.log('      → Business Profile → M-PESA Settings');
console.log('      → Update Paybill/Till Number');
console.log('      → Update Business Name\n');

console.log('   2. M-PESA Business Portal (If needed)');
console.log('      → https://www.safaricom.co.ke/business');
console.log('      → Register/Update your Paybill');
console.log('      → Link to PesaPal account\n');

console.log('⚠️  IMPORTANT NOTES:');
console.log('─'.repeat(40));
console.log('   • Payment details in the UI come from PesaPal, not your code');
console.log('   • You don\'t need to change any code files');
console.log('   • Update your PesaPal merchant account settings');
console.log('   • Test thoroughly before going live');
console.log('   • Keep test and production credentials separate\n');

console.log('🧪 TESTING RECOMMENDATIONS:');
console.log('─'.repeat(40));
console.log('   1. Test in sandbox mode first (PESAPAL_TEST_MODE=true)');
console.log('   2. Verify payment flow end-to-end');
console.log('   3. Check callback handling works correctly');
console.log('   4. Test with KES 1 in production mode');
console.log('   5. Monitor payment success rates\n');

console.log('📞 SUPPORT CONTACTS:');
console.log('─'.repeat(40));
console.log('   • PesaPal Support: support@pesapal.com');
console.log('   • PesaPal Docs: https://developer.pesapal.com/');
console.log('   • M-PESA Business: 0711-222-222\n');

console.log('✨ Next Step: Update your PesaPal merchant dashboard with real payment details!');