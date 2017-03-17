#!/bin/bash

source "build.sh"
functions deploy gmail-to-jira -e test -l bin -T gmail-event
functions call gmail-to-jira --file=test/sample-message.json