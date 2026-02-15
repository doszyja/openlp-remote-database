# MongoDB Compass: Fill empty verseOrder

Use this to fix songs that have empty `verseOrder` by building it from their `verses` array (e.g. `"v1 v2 v3"`).

**Collection:** `songs` (or your actual song collection name)

---

## 1. Find affected documents

**Filter:**

```json
{
  "deletedAt": null,
  "verseOrder": { "$in": [null, ""] },
  "verses": { "$exists": true, "$ne": [], "$type": "array" }
}
```

---

## 2. Update with aggregation pipeline (MongoDB 5.2+)

In Compass: select the `songs` collection → **Update** (or use the aggregation-based update).

**Filter (same as above):**

```json
{
  "deletedAt": null,
  "verseOrder": { "$in": [null, ""] },
  "verses": { "$exists": true, "$ne": [], "$type": "array" }
}
```

**Update type:** **Update with aggregation pipeline**

**Pipeline:**

```json
[
  {
    "$set": {
      "verseOrder": {
        "$trim": {
          "input": {
            "$reduce": {
              "input": { "$sortArray": { "input": "$verses", "sortBy": { "order": 1 } } },
              "initialValue": "",
              "in": {
                "$concat": [
                  "$$value",
                  { "$cond": [{ "$eq": ["$$value", ""] }, "", " "] },
                  {
                    "$ifNull": [
                      "$$this.originalLabel",
                      { "$concat": ["v", { "$toString": "$$this.order" }] }
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
]
```

- **Options:** use **Update all documents matching the filter** to fix all 62 songs in one go.

---

## 3. MongoDB shell script (mongosh)

From repo root, run the script against your database:

```bash
mongosh "mongodb://localhost:27017/YOUR_DB_NAME" scripts/fill-empty-verse-order-mongosh.js
```

With a connection string:

```bash
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname" scripts/fill-empty-verse-order-mongosh.js
```

Or from inside `mongosh`:

```javascript
load('/absolute/path/to/Openlp-database/scripts/fill-empty-verse-order-mongosh.js');
```

Edit `COLLECTION_NAME` in `scripts/fill-empty-verse-order-mongosh.js` if your collection is not `songs`.

---

## 4. Node script (API)

From repo root:

```bash
pnpm --filter api run fill-empty-verse-order
```

This uses the same logic as the API (`defaultVerseOrderFromVerses`) and works on any MongoDB version.
