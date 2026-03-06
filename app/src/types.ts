export type UserDbId = string
export type UserDb = {
    id: UserDbId
    handle: string | null
    created_at: number
}

export type SessionDbId = string
export type SessionsDb = {
    session_id: SessionDbId
    user_id: UserDbId
    created_at: string
    last_seen_at: string
}


export type RateLimitDb = {
    key: string
    count: number
    reset_at: string
}