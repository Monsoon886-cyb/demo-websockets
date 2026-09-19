import "dotenv/config";
import dns from "node:dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const systemLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses.length) {
      return systemLookup(hostname, options, callback);
    }
    if (options.all) {
      return callback(
        null,
        addresses.map((address) => ({ address, family: 4 })),
      );
    }
    callback(null, addresses[0], 4);
  });
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
