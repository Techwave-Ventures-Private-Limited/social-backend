export const BOT_CONFIG = {
  ENABLED: true,
  BOT_COUNT: 100,
  MIN_DELAY_MS: 5 * 60 * 1000,
  MAX_DELAY_MS: 20 * 60 * 1000
};

export const randomDelay = () =>
  Math.floor(
    Math.random() *
    (BOT_CONFIG.MAX_DELAY_MS - BOT_CONFIG.MIN_DELAY_MS)
  ) + BOT_CONFIG.MIN_DELAY_MS;
