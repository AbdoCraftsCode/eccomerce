/**
 * Adds offer information to product/variant if it has a valid offer
 * @param {Object} item - Product or variant object
 * @returns {Object} - Item with offer info added if applicable
 */
const addOfferInfo = (item) => {
  if (!item) return item;

  const currentDate = new Date();
  const hasValidOffer =
    item.offerId &&
    item.offerStatus === "approved" &&
    item.offerEnd &&
    new Date(item.offerEnd) > currentDate;

  if (hasValidOffer) {
    return {
      ...item,
      offer: {
        offerId: item.offerId,
        offerStart: item.offerStart,
        offerEnd: item.offerEnd,
      },
    };
  }

  return item;
};

export { addOfferInfo };
