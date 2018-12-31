// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

admin.initializeApp(functions.config().firebase); // firebase initialize

const db = admin.database().ref('payment2');

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  const userField = request.body.originalDetectIntentRequest;
  let userId;
  if (userField && userField.source === 'line') {
    userId = userField.payload.data.source.userId;
  }
  
  function income(agent) {
    const resultInput = request.body.queryResult;
    const userTxt = resultInput.queryText;
    const value = resultInput.parameters.value;
    
    if(userId) {
      db.child(userId+'/income').push({
        text: userTxt,
        value: value
      });
      db.child(userId+'/total').transaction(current_value => {
        return (current_value || 0) + value ;
      });
    }
  }
  
  function outcome_food(agent) {
    const resultInput = request.body.queryResult;
    const userTxt = resultInput.queryText;
    const value = resultInput.parameters.value;
    const food = resultInput.parameters.food;
    
    if(userId && food) {
      db.child(userId+'/outcome').push({
          text: userTxt,
          value: value,
          type: 'food'
      });
      db.child(userId+'/total').transaction(current_value => {
          return (current_value || 0) - value;
      });
    }
  }

  function outcome_shopping(agent) {
    const resultInput = request.body.queryResult;
    const userTxt = resultInput.queryText;
    const value = resultInput.parameters.value;
    const shopping = resultInput.parameters.shopping;
    
    if(userId && shopping) {
      db.child(userId+'/outcome').push({
          text: userTxt,
          value: value,
          type: 'shopping'
      });
      db.child(userId+'/total').transaction(current_value => {
          return (current_value || 0) - value;
      });
    }
  }
  
  function outcome_transport(agent) {
    const resultInput = request.body.queryResult;
    const userTxt = resultInput.queryText;
    const value = resultInput.parameters.value;
    const transport = resultInput.parameters.transport;
    
    if(userId && transport) {
      db.child(userId+'/outcome').push({
          text: userTxt,
          value: value,
          type: 'transport'
      });
      db.child(userId+'/total').transaction(current_value => {
          return (current_value || 0) - value;
      });
    }
  }
  
  function outcome_other(agent) {
    const resultInput = request.body.queryResult;
    const userTxt = resultInput.queryText;
    const value = resultInput.parameters.value;
    const other = resultInput.parameters.other;
    
    if(userId && other) {
      db.child(userId+'/outcome').push({
          text: userTxt,
          value: value,
          type: 'other'
      });
      db.child(userId+'/total').transaction(current_value => {
          return (current_value || 0) - value;
      });
    }
  }
  
  function checkTotal(agent) {
    if(userId) {
      return db.child(userId+'/total').once('value', snap => {
        return agent.add('มีเงินคงเหลือ '+(snap.val() || 0)+' บาทจ้าา');
      });
    } else {
        agent.add('เช็คยอดเงินทางนี้ไม่ได้นะจ้ะ ><');
    }
  }
  
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
   intentMap.set('Income - custom', income);
   intentMap.set('outcome - food', outcome_food);
   intentMap.set('outcome - shopping', outcome_shopping);
   intentMap.set('outcome - transport', outcome_transport);
   intentMap.set('outcome - other', outcome_other);
   intentMap.set('total', checkTotal);
   
  agent.handleRequest(intentMap);
});
