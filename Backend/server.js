import express from "express";
import axios from "axios";

const app = express();

const BASE_URL = "https://api.mail.tm/";

app.use(express.json());

const PORT = 8080;

let domains = []

async function getDomains() {

    try {
        if (domains.length == 0) {
            const response = await axios.get(BASE_URL + "domains")
            domains = response.data["hydra:member"][0].domain
        }
    
        return domains;
        
    } catch (error) {
        console.log(`getDomains Error, ${error}`)
        return [];
    }
}



app.use("/listdomains", async (req, res) => {

    try {
        console.log(await getDomains())
        res.send("Domains listing success").status(200)
        
    } catch (error) {
        console.log(`List Domain error, ${error}`)
        res.send("Error").status(404)
    }
})


app.get("/create", async (req, res) => {

    let increment = 1312;

    try {
        const {username = `a1b2c3${increment++}`, password = "Hello121World"} = req.body || {}
        const domains = await getDomains();
    
        const emailId = username + "@" + domains
        // console.log(emailId)
    
        const response = await axios.post(BASE_URL + "accounts", {
            address: emailId,
            password: password
        })

        console.log(response)

        if (response) {
            res.json({
            message: "Account created",
            data: response.data,
            });
        }

        else {
            res.json({
                message: "Account creation error"
            })
        }
        
    } catch (error) {
        console.log(`Account Create error, ${error}`)
        res.send("Account Creation Error").status(404)
    }

})


async function getToken(address, password) {
    
    try {
        const response = await axios.post(BASE_URL + "token", {
            address,
            password
        })

        return response.token

    } catch (error) {
        console.log(`Get Token Error, ${error}`)
        return 
    }



}

app.get("/token", async (req, res) => {

    let increment = 1312;

    const {address = `a1b2c3${increment++}@deltajohnsons.com`, password = "Hello121World"} = req.body || {}

    try {
        
        const token = await getToken(address, password);    

        if (!token) {
            console.log("Couldn't fetch token from getToken")
        }

        else {
            console.log("Token Fetch Successful, " + token)
            res.send("Token Fetch Success " + token).status(200)
        }

    } catch (error) {
        console.log("Token fetching error, ${error}")
        res.status(404).send("Token Fetching error, ${error}")
    }

})



app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
































// app.post("/token", async (req, res) => {
//   try {
//     const response = await axios.post(BASE_URL + "token", {
//       address: currentEmail,
//       password: password,
//     });

//     console.log("Token creation success");

//     res.json({
//       message: "Token created",
//       data: response.data,
//     });
//   } catch (error) {
//     console.log(`Error, ${error}`);

//     res.status(500).json({
//       error: "Token creation failed",
//     });
//   }
// });




// app.use("/status", () => {
//   console.log("Backend is running");
// });



// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
