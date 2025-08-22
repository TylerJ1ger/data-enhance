local keys = redis.call("KEYS", "keystore:kw:*")
local target = ARGV[1]
local results = {}

for i=1,#keys do
    local keywords = redis.call("HGET", keys[i], "Keywords")
    if keywords then
        keywords = string.gsub(keywords, "\"", "")
        if string.lower(keywords) == string.lower(target) then
            table.insert(results, {keys[i], keywords})
        end
    end
end

if #results > 0 then
    return results
else
    return "Keyword not found: " .. target
end