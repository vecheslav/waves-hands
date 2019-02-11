import { environment as env } from './environment.testnet'

export const environment = {
  ...env,
  production: false,
  bookingServiceEndpoint: 'http://127.0.0.1:3000',
}
