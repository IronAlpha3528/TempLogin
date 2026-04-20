import express from "express";
import axios from "axios";

const app = express();

const BASE_URL = "https://api.mail.tm/";

app.use(express.json());

const PORT = 8080;

let domains = []

let token = ""

// Returns the available domains
async function getDomains() {
    try {
        if (domains.length === 0) {
            const response = await axios.get(BASE_URL + "domains");
            domains = response.data["hydra:member"];
        }
        domains = domains.map((ele) => ele.domain)
        // console.log(domains)
        return domains;
    } catch (error) {
        console.log(error.response?.data || error.message);
        return [];
    }
}


async function getToken(address, password) {
    try {
        const response = await axios.post(BASE_URL + "token", {
            address,
            password
        })
        return response["data"].token
        
    } catch (error) {
        console.log(`Get Token Error, ${error}`)
        return 
    }
}

app.post("/create", async (req, res) => {
    try {
        const { name, password="Pass12345" } = req.body || {};

        const domains = await getDomains();
        const domain = domains[0];

        const username = name || ("user" + Date.now());

        const emailId = `${username}@${domain}`;

        const response = await axios.post(BASE_URL + "accounts", {
            address: emailId,
            password: password
        });

        token = await getToken(emailId, password);
        // console.log(token)

        res.status(200).json({
            message: `Account created with token ${token}`,
            data: response.data
        });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.status(500).send("Account Creation Error");
    }
});

app.use("/listdomains", async (req, res) => {

    try {
        const domains = await getDomains();
        console.log(domains)
        res.send(`Domains are ${domains[0]}`).status(200)
        
    } catch (error) {
        console.log(`List Domain error, ${error}`)
        res.send("Error").status(404)
    }
})

async function getAccountInfo(token) {
    
    const response = await axios.get(BASE_URL + "me", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    // console.log(response.data)
    return response.data
}


app.get("/me", async (req,res) => {
    
    try {
        const response = await getAccountInfo(token) 
        // console.log(response)
        res.status(200).send(response)
    } catch (error){ 
        console.log(`Error in getting account info, ${error}`)
        res.status(500).send("Error")
    }    
})

async function getMessages(token,page) {
    try {
        const response = await axios.get(BASE_URL + "messages", {
            params: {
                page:page
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        return response.data
    } catch (error) {
        console.log(`getMessages error, ${error}`)        
    }
}


app.get("/messages", async (req, res) => {
    let { page=1 } = req.query
    let token = req.headers.token
    
    try {
        const response = await getMessages(token, page)
        // console.log(response)
        res.status(200).send(response)
    } catch (error) {
        console.log(`Error in getting messages, ${error}`)
        res.status(400).send(error)
    }
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})