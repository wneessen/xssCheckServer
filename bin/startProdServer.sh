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
DIRNAME=$(${ENV} which dirname || exit 1) || (cmdNotFound dirname && return 1)

getBaseDir | read BASEDIR
. ${BASEDIR}/bin/prodServer.local.conf

if [ -e ${PHANTOMJS} ]; then
    PHANTOMJS=$(${ENV} which phantomjs || exit 1) || (cmdNotFound phantomjs && return 1)
fi

if [ "x${LISTENPORT}" != "x" ]; then
    STARTPARMS="${STARTPARMS} -p ${LISTENPORT}"
fi

if [ "x${LISTENHOST}" != "x" ]; then
    STARTPARMS="${STARTPARMS} -l ${LISTENHOST}"
fi

${PHANTOMJS} ${BASEDIR}/dist/xssCheckServer.min.js ${STARTPARMS}