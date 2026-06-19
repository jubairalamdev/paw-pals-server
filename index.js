const dns = require("node:dns");
dns.setServers(['8.8.8.8', '8.8.4.4'])

const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_DB_URI;

app.use(cors())
app.use(express.json())


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the Client with Cluster
        await client.connect();

        // Connect with Database from Cluster
        const db = client.db("pawPals");

        // Connect with Collection from Database
        const petsCollection = db.collection("pets");

        // All pets API
        app.get('/pets', async (req, res) => {
            const cursor = petsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // GET pet by id API
        app.get('/pets/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) }
            try {
                const pet = await petsCollection.findOne(query);
                res.send(pet);
            }
            catch (error) {
                res.send({ ok: false, message: error })
            }
        })

        // GET Requests by user id API
        app.get('/requests/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const cursor = requestsCollection.find({
                userId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run()

app.get('/', (req, res) => {
    res.send('The Root of Server is here')
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})