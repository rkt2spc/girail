#!/bin/bash

source "build.sh"
gcloud beta functions deploy gmail-to-jira --stage-bucket girail-deploy-bucket --timeout 540 --trigger-topic gmail-event --entry-point handle --local-path bin
gcloud beta functions describe gmail-to-jira