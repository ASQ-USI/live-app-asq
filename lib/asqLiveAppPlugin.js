const ASQPlugin = require('asq-plugin');
const Promise = require('bluebird');
const coroutine = Promise.coroutine;

module.exports = ASQPlugin.extend({
  tagName: 'asq-js-function-body-q',

  hooks: {
    'presenter_connected': 'presenterConnected',
    'viewer_connected': 'viewerConnected',
  },

  notifySessionData: function (sessionData, info) {
    const activeViewerQuestion = sessionData.activeViewerQuestion;
    const questions = sessionData.questions;
    const studentQuestionsEnabled = sessionData.studentQuestionsEnabled;
    let type = 'broadcast-student-question';
    const evtName = 'asq:live-app';
    const evt = {};

    let data = {
      question: activeViewerQuestion,
      type,
    };

    if (activeViewerQuestion !== undefined) {
      const header = 'User ' + activeViewerQuestion.submission.user + ' asks:';
      const content = activeViewerQuestion.submission.value;
      data.header = header;
      data.content = content;
    }

    evt.data = data;
    if (activeViewerQuestion !== undefined) {
      this.asq.socket.emit(evtName, evt, info.socketId);
    }


    type = 'update-student-questions';
    data = {
      questions,
      type,
    };
    evt.data = data;
    this.asq.socket.emit(evtName, evt, info.socketId);

    type = 'toggle-student-question-functionality';
    data = {
      studentQuestionsEnabled,
      type,
    };
    evt.data = data;
    this.asq.socket.emit(evtName, evt, info.socketId);
  },

  presenterConnected: coroutine(function* presenterConnectedGen(info) {
    if (!info.session_id) return info;

    const sessionData = yield this.restoreSession(info.session_id);
    this.notifySessionData(sessionData, info);

    // this will be the argument to the next hook
    return info;
  }),

  restoreSession: coroutine(function* restoreSessionGen(sessionId) {
    const Session = this.asq.db.model('Session');
    const Answer = this.asq.db.model('Answer');
    const session = yield Session
      .findById(sessionId)
      .lean()
      .exec();
    const activeViewerQuestionId = session.data.activeViewerQuestion;
    const data = {
      questions: session.data.viewerQuestions,
      studentQuestionsEnabled: session.data.studentQuestionsEnabled,
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

  viewerConnected: coroutine(function* viewerConnectedGen(info) {
    if (!info.session_id) return info;

    const sessionData = yield this.restoreSession(info.session_id);
    this.notifySessionData(sessionData, info);
    // this will be the argument to the next hook
    return info;
  }),


});