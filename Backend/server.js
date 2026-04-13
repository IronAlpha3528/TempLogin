import express from "express";
import axios from "axios";

const app = express();

const BASE_URL = "https://api.mail.tm/";

app.use(express.json());

const PORT = 8080;

let domains = []

async function getDomains() {
    try {
        if (domains.length === 0) {
            const response = await axios.get(BASE_URL + "domains");
            domains = response.data["hydra:member"];
        }
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
        console.log(response["data"].token)
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
        const domain = domains[0].domain;

        const username = name || ("user" + Date.now());

        const emailId = `${username}@${domain}`;

        const response = await axios.post(BASE_URL + "accounts", {
            address: emailId,
            password: password
        });

        const token = await getToken(emailId, password);
        console.log(token)

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
        console.log(domains[0].domain)
        res.send(`Domains are ${domains[0].domain}`).status(200)
        
    } catch (error) {
        console.log(`List Domain error, ${error}`)
        res.send("Error").status(404)
    }
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})