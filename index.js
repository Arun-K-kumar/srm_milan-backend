const express = require('express');
const { createApp } = require('./src/createApp');

const app = createApp(express());

module.exports = app;