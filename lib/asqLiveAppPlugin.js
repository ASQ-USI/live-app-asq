var ASQPlugin = require('asq-plugin');
var Promise = require('bluebird');
var coroutine = Promise.coroutine;

module.exports = ASQPlugin.extend({
  tagName : 'asq-js-function-body-q',

  hooks:{
    "presenter_connected" : "presenterConnected",
    "viewer_connected"    : "viewerConnected"
  },
  forwardSessionData: function (sessionData, info) {
    const activeViewerQuestion = sessionData.activeViewerQuestion;
    const questions = sessionData.questions
    if (activeViewerQuestion) 
      this.asq.socket.emit('share-student-question', activeViewerQuestion, info.socketId);
    const data = {
      questions
    };
    const evt = {
      data,
    };
    this.asq.socket.emit('update-student-questions', evt, info.socketId)
  },

  presenterConnected: coroutine(function *presenterConnectedGen (info){
    if(! info.session_id) return info;

    var sessionData = yield this.restoreSession(info.session_id);
    this.forwardSessionData(sessionData, info);

    //this will be the argument to the next hook
    return info;
  }),

  
  restoreSession: coroutine(function *restoreSessionGen(session_id){
    const Session = this.asq.db.model('Session');
    const Answer = this.asq.db.model('Answer');
    const session = yield Session
      .findById(session_id)
      .lean()
      .exec();
    const activeViewerQuestionId = session.data.activeViewerQuestion;
    const data = {
      questions: session.data.viewerQuestions,
    };
    if (activeViewerQuestionId !== null) {
      const activeViewerQuestion = yield Answer
        .findById(activeViewerQuestionId)
        .lean()
        .exec();
      activeViewerQuestion.id = activeViewerQuestion._id;
      data.activeViewerQuestion = activeViewerQuestion;

    }


    return data;    
  }),
  
  viewerConnected: coroutine(function *viewerConnectedGen (info){
    if(! info.session_id) return info;  

    var sessionData = yield this.restoreSession(info.session_id);
    this.forwardSessionData(sessionData, info);
    // this will be the argument to the next hook
    return info;
  }),


});