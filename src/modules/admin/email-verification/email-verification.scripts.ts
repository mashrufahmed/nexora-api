export const VERIFY_OTP_SCRIPT = `
local record = redis.call('GET', KEYS[1])

if not record then
  return -1
end

local data = cjson.decode(record)

if data.attempts >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  return -2
end

data.attempts = data.attempts + 1

if data.hash == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return 1
end

if data.attempts >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  return -2
end

redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')

return 0
`;
