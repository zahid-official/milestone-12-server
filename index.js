require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// custom middleware for jwt verify
const verifyJWT = (req, res, next) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }

  // verify both tokens
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorize Access" });
    }
    // creating a new property in req object
    req.decodedToken = decoded;
    next();
  });
};

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.rjxsn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // database
    const database = client.db("scholarshipDB");
    const usersCollection = database.collection("usersCollection");
    const scholarshipCollection = database.collection("scholarshipCollection");






    // custom middleware for verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email };
      const userData = await usersCollection.findOne(query);
      const admin = userData?.role === "Admin";
      if (!admin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // custom middleware for verify moderator after verifyToken
    const verifyModerator = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email };
      const userData = await usersCollection.findOne(query);
      const moderator = userData?.role === "Admin" || userData?.role === "Moderator";
      if (!moderator) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // jwt token generate (only for personal info based route)
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });






    // read Operation
    app.get("/", (req, res) => {
      res.send("Server Connected Successfully");
    });

    // manage users data
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // role base user
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      // verify JWT email
      if (req.decodedToken.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const query = { email };
      const userData = await usersCollection.findOne(query);

      let user = false;
      let admin = false;
      let moderator = false;

      if (userData?.role === "Admin") {
        admin = true;
      } else if (userData?.role === "Moderator") {
        moderator = true;
      } else {
        user = true;
      }

      res.send({ admin, moderator, user });
    });



    // top scholarship
    app.get('/topScholarship', async(req,res) => {
      const result = await scholarshipCollection.find().toArray();
      res.send(result);
    })








    // create Operation
    app.post("/users", async (req, res) => {
      const user = req.body;

      // validate existing user
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // add scholarship
    app.post("/addScholarship", verifyJWT, verifyModerator, async(req, res) => {
      const data = req.body;
      const result = await scholarshipCollection.insertOne(data);
      res.send(result);
    })








    // delete Operation
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });







    // update Operation
    app.patch("/users/role/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const role = req.body.role;

      const query = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: { role },
      };

      const result = await usersCollection.updateOne(query, updatedRole);
      res.send(result);
    });


  } finally {
  }
}
run().catch(console.log);

// port running on
app.listen(port, () => {
  console.log(`Server Running on... : ${port}`);
});
