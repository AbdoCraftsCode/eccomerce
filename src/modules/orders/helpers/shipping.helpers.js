// helpers/shipping.helpers.js
const toRad = (value) => value * Math.PI / 180;

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    throw new Error("Missing coordinates for distance calculation", { cause: 400 });
  }
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const calculateShippingCost = (distance, items) => {
  let totalWeight = items.reduce((sum, item) => {
    const weight = parseFloat(item.weight) || 0;
    return sum + weight * item.quantity;
  }, 0);
  const baseCost = 5; // Base shipping cost in USD
  const perKmCost = 0.1; // Cost per km
  const perWeightCost = 0.05; // Cost per unit weight
  return baseCost + (distance * perKmCost) + (totalWeight * perWeightCost);
};