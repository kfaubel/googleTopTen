import fs = require('fs');
// tslint:disable: member-ordering

// This is a general purpose cache class.  It can store any object, 
// identified by a key with a set expiration time.
//  set(key, object, expirationTime)
//     key:            any identifier (string)
//     object:         the object to be stored
//     expirationTime: the date getTime() value (ms since the epoch)
//
//  get(key)
//     key: any identifer (string)
//     Returns:
//        object - if it exists and had not expired
//        null   - otherwise
module.exports = class Cache {
    private static cache: any = {}; 

    private static logger;

    // tslint:disable: member-ordering
    public static setLogger(logger: any) {
        this.logger = logger;
    }

    public static get(key: any) {
        if (Cache.cache[key] !== undefined) {
            const cacheItem: any = Cache.cache[key];

            const expiration = cacheItem.expiration;
            const object     = cacheItem.object;

            const now = new Date();
            if (expiration > now.getTime()) {
                // object is current
                this.logger.verbose("Key: " + key + " - cache hit");
                return object;
            } else {
                // object expired
                this.logger.verbose("Key: " + key + " - cache expired");
            }
        } else {
            this.logger.verbose("Key: " + key + " - cache miss");
        }

        return null;
    }

    public static set(key: string, newObject: any, expirationTime: number) {
        const cacheItem = {expiration: expirationTime, object: newObject}
        Cache.cache[key] =  cacheItem;
    }

    // static async saveCache() {
    //     console.log("Saving cache.");
    //     fs.writeFile('./cache.json', JSON.stringify(BaseballData.cache, null, 4), function(err) {
    //         if(err) console.log(err)
    //     })
    // }
}