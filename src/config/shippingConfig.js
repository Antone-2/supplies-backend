const FREE_DELIVERY_LOCATIONS = ['Nairobi CBD', 'Kiambu Town'];

// Calculate shipping fee based on origin and destination
const calculateShippingFee = (origin, destination) => {
    // Free delivery for specific locations
    if (FREE_DELIVERY_LOCATIONS.includes(destination)) {
        return 0;
    }
    // Simple calculation based on distance (in a real app, you'd use Google Maps API or similar)
    // For now, return a fixed fee
    return 500; // KES 500
};

module.exports = {
    calculateShippingFee
};
