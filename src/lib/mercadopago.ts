import { MercadoPagoConfig } from 'mercadopago';

// Initialize the client object
export const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '', 
  options: { timeout: 5000 } 
});
