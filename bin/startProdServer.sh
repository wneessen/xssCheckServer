#!/usr/bin/env bash

set +m
(shopt >/dev/null 2>&1) && shopt -s lastpipe

function cmdNotFound() {
    missingCmd=${1}
    echo "Required command not found: ${missingCmd}" 2>&1
}

function getBaseDir() {
    BASEDIR="$(${DIRNAME} $0)"
    cd ${BASEDIR}/..
    pwd -P
}

ENV=/usr/bin/env
STARTPARMS=""
SERVERDIR=/usr/local/xssCheckServer
PHANTOMJS=/usr/local/bin/phantomjs
DIRNAME=$(${ENV} which dirname 2>/dev/null || exit 1) || (cmdNotFound dirname && exit 1) || exit 1

getBaseDir | read BASEDIR
if [ -e ${BASEDIR}/bin/prodServer.local.conf ]; then
    . ${BASEDIR}/bin/prodServer.local.conf
fi

if [ ! -e ${PHANTOMJS} ]; then
    PHANTOMJS=$(${ENV} which phantomjs 2>/dev/null || exit 1) || (cmdNotFound phantomjs && exit 1) || exit 1
fi

if [ "x${LISTENPORT}" != "x" ]; then
    STARTPARMS="${STARTPARMS} -p ${LISTENPORT}"
fi

if [ "x${LISTENHOST}" != "x" ]; then
    STARTPARMS="${STARTPARMS} -l ${LISTENHOST}"
fi

${PHANTOMJS} ${BASEDIR}/dist/xssCheckServer.min.js ${STARTPARMS}