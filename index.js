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
        const requestsCollection = db.collection("requests");

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
        app.get('/requests/:id', async (req, res) => {
            const { id } = req.params
            const cursor = requestsCollection.find({
                userId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        // Get User Requests, by Pet ID
        app.get('/requests/pets/:id', async (req, res) => {
            const { id } = req.params
            const cursor = requestsCollection.find({
                petId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        // Get pets listing by User ID API
        app.get('/pets/listings/:id', async (req, res) => {
            const { id } = req.params
            const cursor = petsCollection.find({
                userId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        // Post Request API
        app.post('/requests', async (req, res) => {
            try {
                const adoptionData = req.body;
                const { userId, petId } = adoptionData;
                const existingRequest = await requestsCollection.findOne({
                    userId: userId,
                    petId: petId
                });

                if (existingRequest) {
                    return res.status(400).send({
                        error: "You have already submitted a request for this pet."
                    });
                }
                const result = await requestsCollection.insertOne(adoptionData);
                res.status(201).send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Something went wrong" });
            }
        });

        // delete pet from my listing API 
        app.delete('/pets/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await petsCollection.deleteOne(query);
            res.send(result);
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