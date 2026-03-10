const mockRefundsCreate = jest.fn().mockResolvedValue({ status: 'succeeded' });

const mockStripeInstance = {
  products: { create: jest.fn() },
  prices: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  paymentIntents: { retrieve: jest.fn() },
  refunds: { create: mockRefundsCreate },
};

function Stripe() {
  return mockStripeInstance;
}

Stripe.mockRefundsCreate = mockRefundsCreate;
module.exports = Stripe;
