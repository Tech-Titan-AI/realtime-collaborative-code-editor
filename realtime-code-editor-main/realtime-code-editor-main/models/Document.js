const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  _id: String, // Hum unique room ID ko hi ID banayenge
  data: Object, // Isme editor ka content rahega
});

module.exports = mongoose.model('Document', documentSchema);

//passwaord=Sujeetsingh@123