const dns = require("node:dns");
dns.setServers(['8.8.8.8', '8.8.4.4'])

const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const {createRemoteJWKSet, jwtVerify}= require("jose-cjs");
require('dotenv').config();

const app = express()
const port = process.env.PORT || 5000

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

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.JWKS_URL}`)
)

async function run() {
    try {
        await client.connect();
        const db = client.db("pawPals");

        const petsCollection = db.collection("pets");
        const requestsCollection = db.collection("requests");

        const verifyToken = async(req,res,next)=> {
            const header = req.headers.authorization
            if(!header){
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }
            const token = header.split(" ")[1];
            if(!token){
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }
            try {
                const {payload}= await jwtVerify(token,JWKS)
                next()
            } catch (error){
                return res.status(403).json({
                    message: "Forbidden"
                });
            }
        }

        // All pets API
        app.get('/pets', verifyToken, async (req, res) => {
            const cursor = petsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // GET pet by id API
        app.get('/pets/:id', verifyToken, async (req, res) => {
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

        // Get User Requests, by Pet ID
        app.get('/requests/pets/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const cursor = requestsCollection.find({
                petId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        // Get pets listing by User ID API
        app.get('/pets/listings/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const cursor = petsCollection.find({
                userId: id
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        // Post pet from add pet API
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

        // Cancel Request API
        app.delete('/requests/:id', async (req, res) => {
            const { id } = req.params;
            if (!id || !ObjectId.isValid(id)) {
                return res.status(400).send({ error: "Invalid or blank ID format provided." });
            }

            try {
                const result = await requestsCollection.deleteOne({ _id: new ObjectId(id) });
                console.log(`Documents deleted: ${result.deletedCount}`);
                if (result.deletedCount > 0) {
                    res.send({ message: "Request cancelled successfully" });
                } else {
                    res.status(404).send({ error: "No matching request found with that ID" });
                }
            } catch (error) {
                res.status(500).send({ error: "Server failed to process document deletion" });
            }
        });

        // add pet API
        app.post('/pets', async (req, res) => {
            const newPet = req.body;
            const result = await petsCollection.insertOne(newPet);
            res.send(result);
        })

        // delete pet from my listing API 
        app.delete('/pets/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await petsCollection.deleteOne(query);
            res.send(result);
        })

        // Update Pet API
        app.patch('/pets/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            }
            const modifiedPet = req.body;
            const updatedDocument = {
                $set: {
                    name: modifiedPet.name,
                    species: modifiedPet.species,
                    breed: modifiedPet.breed,
                    age: modifiedPet.age,
                    gender: modifiedPet.gender,
                    image: modifiedPet.image,
                    healthStatus: modifiedPet.healthStatus,
                    vaccinationStatus: modifiedPet.vaccinationStatus,
                    location: modifiedPet.location,
                    adoptionFee: modifiedPet.adoptionFee,
                    description: modifiedPet.description,
                }
            }
            const result = await petsCollection.updateOne(filter, updatedDocument);
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