
import config from '../config.json' with { type: "json" }

export const DEV = config.ENV !== 'production'

export const PORT = config.PORT