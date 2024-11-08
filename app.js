require('dotenv').config();

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { v4: uuidv4 } = require('uuid');
const aws = require('aws-sdk');
const methodOverride = require('method-override');


const app = express();
const port = process.env.PORT || 5000;

let awsConfig = {
  "region":process.env.AWS_REGION,
  "endpoint": "https://dynamodb.eu-north-1.amazonaws.com",
  "accessKeyId":process.env.AWS_ACCESS_KEY_ID,
  "secretAccessKey":process.env.AWS_SECRET_ACCESS_KEY
};

aws.config.update(awsConfig);
const docClient = new aws.DynamoDB.DocumentClient();




app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride('_method'));
 

// Static Files
app.use(express.static('public'));

// Templating Engine
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');


app.get("/",(req,res)=>{
  res.render("index.ejs");
});
app.get("/about",(req,res)=>{
  res.render("about.ejs");
});


app.get("/dashboard",(req,res)=>{
  //read all notes
  try{
    const params = {
      TableName: 'notes'
  };


  docClient.scan(params, (err, data) => {
      if (err) {
          console.error('Unable to scan the table. Error:', JSON.stringify(err, null, 2));
          res.status(500).send('Unable to fetch posts');
      } else {
          res.render("dashboard.ejs",{notes: data.Items});
      }
    });
  }

  catch(error){
    console.log(error);
  }
  
});
app.get("/add", (req,res)=>{
  res.render("add.ejs");

});
//Add new Post
app.post("/add",async (req,res)=>{
  var date = new Date();
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = date.getFullYear();
    date = dd + '/' + mm + '/' + yyyy;
    const { title, body } = req.body;
    

    // Create a new entry object. Add other fields if necessary.
    const newEntry = {
        id:uuidv4(),
        title: title,
        body: body,
        dateCreated: date
    };

    const params = {
        TableName: 'notes', // Replace with your DynamoDB table name
        Item: newEntry
    };

    try {
        // Insert the new entry into DynamoDB
        await docClient.put(params).promise();
        console.log(`New entry created:`, newEntry);
        
        // Redirect to the homepage or wherever you want
        res.redirect("/dashboard"); // Redirect or send a success message
    } catch (error) {
        console.error('Error inserting entry:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get("/item/:id",async(req,res)=>{
  try{
    const slug = req.params.id;
    const params = {

        TableName: 'notes',  // Replace with your table name
        Key: {
            id: slug // Replace with your primary key attribute name and value
        }
    };

   // Use a promise to handle the async get call
   const data = await docClient.get(params).promise();
   if (data.Item) {
    console.log("Get item succeeded:", JSON.stringify(data.Item, null, 2));

    const locals = {
        id: data.Item.id, // Use the title from the retrieved item
        
    };
  
    res.render('view-note', { note: data.Item, locals });
} else {
    console.log("No item found with the specified title.");
    res.status(404).send("Post not found."); // Send a 404 response if not found
}
} catch (err) {
console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
res.status(500).send("Internal server error."); // Handle errors gracefully
}

});
app.get("/edit/:id", async(req,res)=>{
 
    try{
      const slug = req.params.id;
      const params = {
  
          TableName: 'notes',  // Replace with your table name
          Key: {
              id: slug // Replace with your primary key attribute name and value
          }
      };
  
     // Use a promise to handle the async get call
     const data = await docClient.get(params).promise();
     if (data.Item) {
      console.log("Get item succeeded:", JSON.stringify(data.Item, null, 2));
  
      const locals = {
          id: data.Item.id, // Use the title from the retrieved item
          
      };
    
      res.render('edit', { note: data.Item, locals });
  } else {
      console.log("No item found with the specified title.");
      res.status(404).send("Post not found."); // Send a 404 response if not found
  }
  } catch (err) {
  console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
  res.status(500).send("Internal server error."); // Handle errors gracefully
  }
  
  });


app.post("/edit/:id",async(req,res)=>{
  const slug = decodeURIComponent(req.params.id);
  const { title, body } = req.body;
  var date = new Date();
        var dd = String(date.getDate()).padStart(2, '0');
        var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = date.getFullYear();
        date = dd + '/' + mm +'/' + yyyy;
    
        const params = {
            TableName: 'notes', // Your DynamoDB table name
            Item: {
                id:slug,
                title:title,
                body: body,
                dateUpdated: date // Update as needed
            }
        };
    
        try {
            await docClient.put(params).promise();
            console.log(`Post updated:`, { id: slug, body });
    
            res.redirect("/dashboard"); // Redirect after successful update
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).send("Internal Server Error");
        }

});

app.post('/delete/:id', async (req, res) => {
  const noteId = req.params.id;
  const params = {
    TableName: 'notes', // Your DynamoDB table name
    Key: {
        id: noteId // Using title as the primary key
    }
  };
  try {
    // Delete the item from DynamoDB
    await docClient.delete(params).promise();
    console.log(`Post deleted with id: ${noteId}`);
    
    // Redirect to the homepage or send a success message
    res.redirect("/dashboard"); // Redirect after deletion
} catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send("Internal Server Error");
}
});



app.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});