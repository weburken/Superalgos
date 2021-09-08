exports.newHttpInterface = function newHttpInterface() {

    /*
    IMPORTANT: If you are reviewing the code of the project please note 
    that this file is the single file in the whole system that accumulated
    more technical debt by far. I did not have the time yet to pay the 
    technical debt, and therefore there is a lot to reorganize in here. 
    I will remove this note once this job is done.
    */
    let thisObject = {
        initialize: initialize,
        finalize: finalize
    }

    let webhook = new Map()

    return thisObject

    function finalize() {
        webhook = undefined
    }

    function initialize() {
        /*
        We will create an HTTP Server and leave it running forever.
        */
       SA.nodeModules.http.createServer(onHttpRequest).listen(global.env.CLIENT_HTTP_INTERFACE_PORT)
       /* Starting the browser now is optional */
       if (process.argv.includes("noBrowser")) {
           //Running Client only with no UI.
       } else {
           SA.nodeModules.open('http://localhost:' + global.env.CLIENT_HTTP_INTERFACE_PORT)
       }
    }

    function onHttpRequest(httpRequest, httpResponse) {
        try {
            let requestPathAndParameters = httpRequest.url.split('?') // Remove version information
            let requestPath = requestPathAndParameters[0].split('/')
            let endpointOrFile = requestPath[1]

            switch (endpointOrFile) {

                case 'WEB3':
                    {
                        SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                        async function processRequest(body) {
                            try {
                                let params = JSON.parse(body)

                                switch (params.method) {
                                    case 'getNetworkClientStatus': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.getNetworkClientStatus(
                                            params.host,
                                            params.port,
                                            params.interface
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'createWalletAccount': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.createWalletAccount(
                                            params.entropy
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'getWalletBalances': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.getWalletBalances(
                                            params.host,
                                            params.port,
                                            params.interface,
                                            params.walletDefinition
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'signData': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.signData(
                                            params.privateKey,
                                            params.data
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'recoverAddress': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.recoverAddress(
                                            params.signature
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'mnemonicToPrivateKey': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.mnemonicToPrivateKey(
                                            params.mnemonic
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    default: {
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify({ error: 'Method ' + params.method + ' is invalid.' }), httpResponse)
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] httpInterface -> WEB3s -> Method call produced an error.')
                                console.log('[ERROR] httpInterface -> WEB3s -> err.stack = ' + err.stack)
                                console.log('[ERROR] httpInterface -> WEB3s -> Params Received = ' + body)

                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'CCXT':
                    {
                        SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                        async function processRequest(body) {
                            try {
                                let params = JSON.parse(body)

                                switch (params.method) {
                                    case 'fetchMarkets': {

                                        const exchangeClass = SA.nodeModules.ccxt[params.exchangeId]
                                        const exchangeConstructorParams = {
                                            'timeout': 30000,
                                            'enableRateLimit': true,
                                            verbose: false
                                        }

                                        let ccxtExchange = new exchangeClass(exchangeConstructorParams)
                                        let ccxtMarkets = []

                                        if (ccxtExchange.has.fetchMarkets === true) {
                                            ccxtMarkets = await ccxtExchange.fetchMarkets()
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(ccxtMarkets), httpResponse)
                                        return
                                    }
                                    case 'listExchanges': {
                                        let exchanges = []
                                        for (let i = 0; i < SA.nodeModules.ccxt.exchanges.length; i++) {
                                            let exchangeId = SA.nodeModules.ccxt.exchanges[i]

                                            const exchangeClass = SA.nodeModules.ccxt[exchangeId]
                                            const exchangeConstructorParams = {
                                                'timeout': 30000,
                                                'enableRateLimit': true,
                                                verbose: false
                                            }
                                            let ccxtExchange
                                            try { ccxtExchange = new exchangeClass(exchangeConstructorParams) }
                                            catch (err) { }
                                            if (ccxtExchange === undefined) { continue }


                                            if (ccxtExchange.has.fetchOHLCV === params.has.fetchOHLCV) {
                                                if (ccxtExchange.has.fetchMarkets === params.has.fetchMarkets) {
                                                    if (ccxtExchange.timeframes['1m'] !== undefined) {
                                                        let exchange = {
                                                            name: ccxtExchange.name,
                                                            id: ccxtExchange.id
                                                        }
                                                        exchanges.push(exchange)
                                                    }
                                                }
                                            }
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(exchanges), httpResponse)
                                        return
                                    }
                                }

                                let content = {
                                    err: global.DEFAULT_FAIL_RESPONSE // method not supported
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(content), httpResponse)

                            } catch (err) {
                                console.log('[INFO] httpInterface -> CCXT FetchMarkets -> Could not fetch markets.')
                                let error = {
                                    result: 'Fail Because',
                                    message: err.message
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'Webhook':
                    {
                        switch (requestPath[2]) { // switch by command
                            case 'Fetch-Messages': {
                                let exchange = requestPath[3]
                                let market = requestPath[4]

                                /* Some validations */
                                if (exchange === undefined) {
                                    console.log('[WARN] httpInterface -> Webhook -> Fetch-Messages -> Message with no Exchange received -> messageReceived = ' + messageReceived)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }
                                if (market === undefined) {
                                    console.log('[WARN] httpInterface -> Webhook -> Fetch-Messages -> Message with no market received -> messageReceived = ' + messageReceived)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }

                                let key = exchange + '-' + market

                                let webhookMessages = webhook.get(key)
                                if (webhookMessages === undefined) {
                                    webhookMessages = []
                                }

                                console.log('[INFO] httpInterface -> Webhook -> Fetch-Messages -> Exchange-Market = ' + exchange + '-' + market)
                                console.log('[INFO] httpInterface -> Webhook -> Fetch-Messages -> Messeges Fetched by Webhooks Sensor Bot = ' + webhookMessages.length)

                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(webhookMessages), httpResponse)
                                webhookMessages = []

                                webhook.set(key, webhookMessages)
                                break
                            }
                            case 'New-Message': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                function processRequest(messageReceived) {
                                    let timestamp = (new Date()).valueOf()
                                    let source = requestPath[3]
                                    let exchange = requestPath[4]
                                    let market = requestPath[5]

                                    /* Some validations */
                                    if (source === undefined) {
                                        console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no Source received -> messageReceived = ' + messageReceived)
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        return
                                    }
                                    if (exchange === undefined) {
                                        console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no Exchange received -> messageReceived = ' + messageReceived)
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        return
                                    }
                                    if (market === undefined) {
                                        console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no market received -> messageReceived = ' + messageReceived)
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        return
                                    }

                                    let key = exchange + '-' + market

                                    let webhookMessages = webhook.get(key)
                                    if (webhookMessages === undefined) {
                                        webhookMessages = []
                                    }

                                    webhookMessages.push([timestamp, source, messageReceived])
                                    webhook.set(key, webhookMessages)

                                    console.log('[INFO] httpInterface -> Webhook -> New-Message -> Exchange-Market = ' + exchange + '-' + market)
                                    console.log('[INFO] httpInterface -> Webhook -> New-Message -> messageReceived = ' + messageReceived)
                                    console.log('[INFO] httpInterface -> Webhook -> New-Message -> Messeges waiting to be Fetched by Webhooks Sensor Bot = ' + webhookMessages.length)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                }
                                break
                            }
                        }
                    }
                    break
                case 'Docs':
                    {
                        switch (requestPath[2]) { // switch by command
                            case 'Save-Node-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Nodes'

                                        if (checkAllSchmemaDocuments('Node', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }

                            case 'Save-Concept-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Concepts'

                                        if (checkAllSchmemaDocuments('Concept', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }

                            case 'Save-Topic-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Topics'

                                        if (checkAllSchmemaDocuments('Topic', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }

                            case 'Save-Tutorial-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Tutorials'

                                        if (checkAllSchmemaDocuments('Tutorial', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }

                            case 'Save-Review-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Reviews'

                                        if (checkAllSchmemaDocuments('Review', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }

                            case 'Save-Book-Schema': {
                                SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                                async function processRequest(body) {
                                    try {
                                        let docsSchema = JSON.parse(body)
                                        let project = requestPath[3]
                                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Books'

                                        if (checkAllSchmemaDocuments('Book', docsSchema, filePath) === true) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        } else {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        }

                                    } catch (err) {
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> Params Received = ' + body)

                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    }
                                }
                                break
                            }
                        }

                        function checkAllSchmemaDocuments(category, docsSchema, filePath) {
                            const fs = SA.nodeModules.fs
                            let noErrorsDuringSaving = true

                            for (let i = 0; i < docsSchema.length; i++) {
                                let schemaDocument = docsSchema[i]
                                /*
                                For some type of schemas we will save the file at an extra
                                folder derived from the document's type.
                                */
                                let fileName = schemaDocument.type.toLowerCase()
                                for (let j = 0; j < 10; j++) {
                                    fileName = cleanFileName(fileName)
                                }
                                let pageNumber = '00' + schemaDocument.pageNumber
                                let newFilepath = filePath
                                switch (category) {
                                    case 'Topic': {
                                        fileName = schemaDocument.topic.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                        fileName = cleanFileName(fileName)
                                        newFilepath = createPrefixDirectories(filePath, schemaDocument.topic)
                                        break
                                    }
                                    case 'Tutorial': {
                                        fileName = schemaDocument.tutorial.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                        fileName = cleanFileName(fileName)
                                        newFilepath = createPrefixDirectories(filePath, schemaDocument.tutorial)
                                        break
                                    }
                                    case 'Review': {
                                        fileName = schemaDocument.review.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                        fileName = cleanFileName(fileName)
                                        newFilepath = createPrefixDirectories(filePath, schemaDocument.review)
                                        break
                                    }
                                    case 'Node': {
                                        newFilepath = createPrefixDirectories(filePath, schemaDocument.type)
                                        break
                                    }
                                    case 'Concept': {
                                        newFilepath = createPrefixDirectories(filePath, schemaDocument.type)
                                        break
                                    }
                                }

                                function createPrefixDirectories(filePath, schemaTextToUse) {
                                    let firstLetter = schemaTextToUse.substring(0, 1)
                                    createNewDir(filePath + '/' + firstLetter)
                                    let extraWord = schemaTextToUse.split(' ')[0]
                                    createNewDir(filePath + '/' + firstLetter + '/' + extraWord)
                                    return filePath + '/' + firstLetter + '/' + extraWord + '/' + cleanFileName(schemaTextToUse)
                                }

                                fileName = fileName + '.json'

                                if (schemaDocument.deleted === true) {
                                    try {
                                        fs.unlinkSync(newFilepath + '/' + fileName)
                                        console.log('[SUCCESS] ' + newFilepath + '/' + fileName + ' deleted.')
                                    } catch (err) {
                                        noErrorsDuringSaving = false
                                        console.log('[ERROR] httpInterface -> Docs -> Delete -> ' + newFilepath + '/' + fileName + ' could not be deleted.')
                                        console.log('[ERROR] httpInterface -> Docs -> Delete -> Resolve the issue that is preventing the Client to delete this file. Look at the error message below as a guide. At the UI you will need to delete this page again in order for the Client to retry next time you execute the docs.save command.')
                                        console.log('[ERROR] httpInterface -> Docs -> Delete -> err.stack = ' + err.stack)
                                    }
                                } else {
                                    if (schemaDocument.updated === true || schemaDocument.created === true) {
                                        try {
                                            let created = schemaDocument.created
                                            let updated = schemaDocument.updated
                                            schemaDocument.updated = undefined
                                            schemaDocument.created = undefined
                                            let fileContent = JSON.stringify(schemaDocument, undefined, 4)
                                            createNewDir(newFilepath)
                                            fs.writeFileSync(newFilepath + '/' + fileName, fileContent)
                                            if (created === true) {
                                                console.log('[SUCCESS] ' + newFilepath + '/' + fileName + '  created.')
                                            } else {
                                                if (updated === true) {
                                                    console.log('[SUCCESS] ' + newFilepath + '/' + fileName + '  updated.')
                                                }
                                            }
                                        } catch (err) {
                                            noErrorsDuringSaving = false
                                            console.log('[ERROR] httpInterface -> Docs -> Save -> ' + newFilepath + '/' + fileName + ' could not be created / updated.')
                                            console.log('[ERROR] httpInterface -> Docs -> Save -> err.stack = ' + err.stack)
                                        }
                                    }
                                }

                                function createNewDir(path) {
                                    try {
                                        fs.mkdirSync(path)
                                    } catch (err) {
                                        if (err.message.indexOf('file already exists') < 0) {
                                            throw (err)
                                        }
                                    }
                                }
                            }

                            return noErrorsDuringSaving
                        }

                        function cleanFileName(fileName) {
                            for (let i = 0; i < 100; i++) {
                                fileName = fileName
                                    .replace(' ', '-')
                                    .replace('--', '-')
                                    .replace('?', '')
                                    .replace('#', '')
                                    .replace('$', '')
                                    .replace('%', '')
                                    .replace('^', '')
                                    .replace('&', '')
                                    .replace('*', '')
                                    .replace('(', '')
                                    .replace(')', '')
                                    .replace('!', '')
                                    .replace('..', '.')
                                    .replace(',', '')
                                    .replace('\'', '')
                            }
                            return fileName
                        }
                    }
                    break
                case 'App':
                    {
                        switch (requestPath[2]) { // switch by command
                            case 'Contribute': {
                                try {
                                    let commitMessage = unescape(requestPath[3])
                                    const username = unescape(requestPath[4])
                                    const token = unescape(requestPath[5])
                                    const currentBranch = unescape(requestPath[6])
                                    const contributionsBranch = unescape(requestPath[7])
                                    let error

                                    /* Unsavping # */
                                    for (let i = 0; i < 10; i++) {
                                        commitMessage = commitMessage.replace('_SLASH_', '/')
                                        commitMessage = commitMessage.replace('_HASHTAG_', '#')
                                    }

                                    contribute()

                                    async function contribute() {
                                        const { lookpath } = require('lookpath');
                                        const gitpath = await lookpath('git');
                                        if (gitpath === undefined) {
                                            console.log('[ERROR] `git` not installed.')
                                        } else {
                                            await doGit()
                                            if (error !== undefined) {

                                                let docs = {
                                                    project: 'Foundations',
                                                    category: 'Topic',
                                                    type: 'App Error - Contribution Not Sent',
                                                    anchor: undefined,
                                                    placeholder: {}
                                                }

                                                respondWithDocsObject(docs, error)
                                                return
                                            }

                                            await doGithub()
                                            if (error !== undefined) {

                                                let docs = {
                                                    project: 'Foundations',
                                                    category: 'Topic',
                                                    type: 'App Error - Contribution Not Sent',
                                                    anchor: undefined,
                                                    placeholder: {}
                                                }
                                                console.log('respond with docs ')

                                                respondWithDocsObject(docs, error)
                                                return
                                            }
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                        }
                                    }

                                    async function doGit() {
                                        const simpleGit = require('simple-git');
                                        const options = {
                                            baseDir: process.cwd(),
                                            binary: 'git',
                                            maxConcurrentProcesses: 6,
                                        }
                                        const git = simpleGit(options)

                                        try {
                                            await git.add('./*')
                                            await git.commit(commitMessage)
                                            await git.push('origin', currentBranch)
                                        } catch (err) {
                                            console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> Method call produced an error.')
                                            console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> err.stack = ' + err.stack)
                                            console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> commitMessage = ' + commitMessage)
                                            console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> currentBranch = ' + currentBranch)
                                            console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> contributionsBranch = ' + contributionsBranch)
                                            console.log('')
                                            console.log('Torubleshooting Tips:')
                                            console.log('')
                                            console.log('1. Make sure that you have set up your Github Username and Token at the APIs -> Github API node at the workspace.')
                                            console.log('2. Make sure you are running the latest version of Git available for your OS.')
                                            console.log('3. Make sure that you have cloned your Superalgos repository fork, and not the main Superalgos repository.')
                                            console.log('4. If your fork is old, you might need to do an app.update and also a node setup at every branch. If you just reforked all is good.')
                                            error = err
                                        }
                                    }

                                    async function doGithub() {

                                        const { Octokit } = require("@octokit/rest")

                                        const octokit = new Octokit({
                                            auth: token,
                                            userAgent: 'Superalgos Beta 11'
                                        })

                                        const repo = 'Superalgos'
                                        const owner = 'Superalgos'
                                        const head = username + ':' + contributionsBranch
                                        const base = currentBranch
                                        const title = 'Contribution: ' + commitMessage

                                        try {
                                            await octokit.pulls.create({
                                                owner,
                                                repo,
                                                title,
                                                head,
                                                base,
                                            });
                                        } catch (err) {
                                            if (err.stack.indexOf('A pull request already exists') >= 0) {
                                                return
                                            } else {
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> Method call produced an error.')
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> err.stack = ' + err.stack)
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> commitMessage = ' + commitMessage)
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> username = ' + username)
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> token starts with = ' + token.substring(0, 10) + '...')
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> token ends with = ' + '...' + token.substring(token.length - 10))
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> currentBranch = ' + currentBranch)
                                                console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> contributionsBranch = ' + contributionsBranch)
                                                error = err
                                            }
                                        }
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> commitMessage = ' + commitMessage)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> username = ' + username)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> token starts with = ' + token.substring(0, 10) + '...')
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> token ends with = ' + '...' + token.substring(token.length - 10))
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> currentBranch = ' + currentBranch)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> contributionsBranch = ' + contributionsBranch)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                }
                                break
                            }

                            case 'Update': {
                                try {
                                    const currentBranch = unescape(requestPath[3])
                                    update()

                                    async function update() {
                                        const { lookpath } = require('lookpath');
                                        const gitpath = await lookpath('git');
                                        if (gitpath === undefined) {
                                            console.log('[ERROR] `git` not installed.')
                                        } else {
                                            let result = await doGit()

                                            if (result.error === undefined) {
                                                let customResponse = {
                                                    result: global.CUSTOM_OK_RESPONSE.result,
                                                    message: result.message
                                                }
                                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(customResponse), httpResponse)
                                            } else {

                                                let docs = {
                                                    project: 'Foundations',
                                                    category: 'Topic',
                                                    type: 'App Error - Update Failed',
                                                    anchor: undefined,
                                                    placeholder: {}
                                                }

                                                respondWithDocsObject(docs, result.error)

                                            }
                                        }
                                    }

                                    async function doGit() {
                                        const simpleGit = require('simple-git');
                                        const options = {
                                            baseDir: process.cwd(),
                                            binary: 'git',
                                            maxConcurrentProcesses: 6,
                                        }
                                        const git = simpleGit(options)

                                        let message
                                        try {
                                            message = await git.pull('https://github.com/Superalgos/Superalgos', currentBranch)
                                            return { message: message }
                                        } catch (err) {
                                            console.log('[ERROR] Error updating ' + currentBranch)
                                            console.log(err.stack)
                                            return { error: err }
                                        }
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                }
                                break
                            }

                            case 'Checkout': {
                                try {
                                    const currentBranch = unescape(requestPath[3])
                                    let error

                                    checkout()

                                    async function checkout() {
                                        const { lookpath } = require('lookpath');
                                        const gitpath = await lookpath('git');
                                        if (gitpath === undefined) {
                                            console.log('[ERROR] `git` not installed.')
                                        } else {
                                            await doGit()

                                            if (error === undefined) {
                                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                            } else {
                                                let docs = {
                                                    project: 'Foundations',
                                                    category: 'Topic',
                                                    type: 'Switching Branches - Current Branch Not Changed',
                                                    anchor: undefined,
                                                    placeholder: {}
                                                }

                                                respondWithDocsObject(docs, error)
                                            }
                                        }
                                    }

                                    async function doGit() {
                                        const simpleGit = require('simple-git');
                                        const options = {
                                            baseDir: process.cwd(),
                                            binary: 'git',
                                            maxConcurrentProcesses: 6,
                                        }
                                        const git = simpleGit(options)
                                        try {
                                            await git.checkout(currentBranch)
                                        } catch (err) {
                                            console.log('[ERROR] Error changing current branch to ' + currentBranch)
                                            console.log(err.stack)
                                            error = err
                                        }
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                }
                                break
                            }

                            case 'Branch': {
                                try {
                                    branch()

                                    async function branch() {
                                        const { lookpath } = require('lookpath');
                                        const gitpath = await lookpath('git');
                                        if (gitpath === undefined) {
                                            console.log('[ERROR] `git` not installed.')
                                        } else {
                                            let result = await doGit()

                                            if (result.error === undefined) {
                                                let customResponse = {
                                                    result: global.CUSTOM_OK_RESPONSE.result,
                                                    message: result
                                                }
                                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(customResponse), httpResponse)
                                            } else {
                                                let docs = {
                                                    project: 'Foundations',
                                                    category: 'Topic',
                                                    type: 'App Error - Could Not Get Current Branch',
                                                    anchor: undefined,
                                                    placeholder: {}
                                                }

                                                respondWithDocsObject(docs, error)
                                            }
                                        }
                                    }

                                    async function doGit() {
                                        const simpleGit = require('simple-git');
                                        const options = {
                                            baseDir: process.cwd(),
                                            binary: 'git',
                                            maxConcurrentProcesses: 6,
                                        }
                                        const git = simpleGit(options)
                                        try {
                                            return await git.branch()
                                        } catch (err) {
                                            console.log('[ERROR] Error reading current branch.')
                                            console.log(err.stack)
                                        }
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                }
                                break
                            }
                        }

                        function respondWithDocsObject(docs, error) {

                            if (error.message !== undefined) {
                                docs.placeholder.errorMessage = {
                                    style: 'Error',
                                    text: error.message
                                }
                            }
                            if (error.stack !== undefined) {
                                docs.placeholder.errorStack = {
                                    style: 'Javascript',
                                    text: error.stack
                                }
                            }
                            if (error.code !== undefined) {
                                docs.placeholder.errorCode = {
                                    style: 'Json',
                                    text: error.code
                                }
                            }

                            docs.placeholder.errorDetails = {
                                style: 'Json',
                                text: JSON.stringify(error, undefined, 4)
                            }

                            let customResponse = {
                                result: global.CUSTOM_FAIL_RESPONSE.result,
                                docs: docs
                            }

                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(customResponse), httpResponse)

                        }
                    }
                    break
                case 'GOV':
                    {
                        /*
                        This is the Governance endpoint at the Http Interface. All methods
                        related to the Governance System are implemented here and routed
                        to the backend Servers that can process them. 
                        */
                        SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                        async function processRequest(body) {
                            try {
                                let params = JSON.parse(body)

                                switch (params.method) {
                                    case 'getGithubStars': {

                                        let serverResponse = await CL.servers.GITHUB_SERVER.getGithubStars(
                                            params.repository,
                                            params.username,
                                            params.token
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'getGithubWatchers': {

                                        let serverResponse = await CL.servers.GITHUB_SERVER.getGithubWatchers(
                                            params.repository,
                                            params.username,
                                            params.token
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'getGithubForks': {

                                        let serverResponse = await CL.servers.GITHUB_SERVER.getGithubForks(
                                            params.repository,
                                            params.username,
                                            params.token
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'mergePullRequests': {

                                        let serverResponse = await CL.servers.GITHUB_SERVER.mergePullRequests(
                                            params.commitMessage,
                                            params.username,
                                            params.token
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    case 'payContributors': {

                                        let serverResponse = await CL.servers.WEB3_SERVER.payContributors(
                                            params.contractAddress,
                                            params.contractAbi,
                                            params.paymentsArray,
                                            params.mnemonic
                                        )

                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                        return
                                    }
                                    default: {
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify({ error: 'Method ' + params.method + ' is invalid.' }), httpResponse)
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] httpInterface -> GOV -> Method call produced an error.')
                                console.log('[ERROR] httpInterface -> GOV -> err.stack = ' + err.stack)
                                console.log('[ERROR] httpInterface -> GOV -> Params Received = ' + body)

                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'LegacyPlotter.js':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/WebServer/LegacyPlotter.js', httpResponse)
                    }
                    break
                case 'PlotterPanel.js':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/WebServer/PlotterPanel.js', httpResponse)
                    }
                    break
                case 'Images': // This means the Images folder.
                    {
                        let path = global.env.PATH_TO_CLIENT + '/WebServer/Images/' + requestPath[2]

                        if (requestPath[3] !== undefined) {
                            path = path + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            path = path + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            path = path + '/' + requestPath[5]
                        }

                        path = unescape(path)

                        SA.projects.foundations.utilities.httpResponses.respondWithImage(path, httpResponse)
                    }
                    break
                case 'Icons': // This means the Icons folder under Projects.
                    {
                        let path = global.env.PATH_TO_PROJECTS + '/' + requestPath[2] + '/Icons'

                        if (requestPath[3] !== undefined) {
                            path = path + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            path = path + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            path = path + '/' + requestPath[5]
                        }

                        path = unescape(path)

                        SA.projects.foundations.utilities.httpResponses.respondWithImage(path, httpResponse)
                    }
                    break
                case 'GIFs': // This means the GIFs folder under Projects.
                    {
                        let path = global.env.PATH_TO_PROJECTS + '/' + requestPath[2] + '/GIFs'

                        if (requestPath[3] !== undefined) {
                            path = path + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            path = path + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            path = path + '/' + requestPath[5]
                        }

                        path = unescape(path)
                        SA.projects.foundations.utilities.httpResponses.respondWithImage(path, httpResponse)
                    }
                    break
                case 'PNGs': // This means the PNGs folder under Projects.
                    {
                        let path = global.env.PATH_TO_PROJECTS + '/' + requestPath[2] + '/PNGs'

                        if (requestPath[3] !== undefined) {
                            path = path + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            path = path + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            path = path + '/' + requestPath[5]
                        }

                        path = unescape(path)
                        SA.projects.foundations.utilities.httpResponses.respondWithImage(path, httpResponse)
                    }
                    break
                case 'WebServer': // This means the WebServer folder.
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/WebServer/' + requestPath[2], httpResponse)
                    }
                    break
                case 'externalScripts': // This means the WebServer folder.
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/WebServer/externalScripts/' + requestPath[2], httpResponse)
                    }
                    break
                case 'Plotters': // This means the plotter folder, not to be confused with the Plotters script!
                    {
                        let project = requestPath[2]
                        let dataMine = requestPath[3]
                        let codeName = requestPath[4]
                        let moduleName = requestPath[5]
                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/' + 'Bots-Plotters-Code' + '/' + dataMine + '/plotters/' + codeName + '/' + moduleName
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(filePath, httpResponse)
                    }
                    break
                case 'ChartLayers':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/UI/' + endpointOrFile + '/' + requestPath[2], httpResponse)
                    }
                    break
                case 'Files':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_CLIENT + '/UI/Data-Files/' + requestPath[2], httpResponse)
                    }
                    break
                case 'Fonts':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithFont(global.env.PATH_TO_FONTS + '/' + requestPath[2], httpResponse)
                    }
                    break
                case 'Schema':
                    {
                        sendSchema(global.env.PATH_TO_PROJECTS + '/' + requestPath[2] + '/Schemas/', requestPath[3])

                        function sendSchema(filePath, schemaType) {
                            let fs = SA.nodeModules.fs
                            try {
                                let folder = ''
                                switch (schemaType) {
                                    case 'AppSchema': {
                                        folder = 'App-Schema'
                                        break
                                    }
                                    case 'DocsNodeSchema': {
                                        folder = 'Docs-Nodes'
                                        break
                                    }
                                    case 'DocsConceptSchema': {
                                        folder = 'Docs-Concepts'
                                        break
                                    }
                                    case 'DocsTopicSchema': {
                                        folder = 'Docs-Topics'
                                        break
                                    }
                                    case 'DocsTutorialSchema': {
                                        folder = 'Docs-Tutorials'
                                        break
                                    }
                                    case 'DocsReviewSchema': {
                                        folder = 'Docs-Reviews'
                                        break
                                    }
                                    case 'DocsBookSchema': {
                                        folder = 'Docs-Books'
                                        break
                                    }
                                }
                                SA.projects.foundations.utilities.filesAndDirectories.getAllFilesInDirectoryAndSubdirectories(filePath + folder, onFilesReady)
                                function onFilesReady(files) {

                                    let schemaArray = []
                                    for (let k = 0; k < files.length; k++) {
                                        let name = files[k]
                                        let nameSplitted = name.split(folder)
                                        let fileName = nameSplitted[1]
                                        for (let i = 0; i < 10; i++) {
                                            fileName = fileName.replace('\\', '/')
                                        }
                                        let fileToRead = filePath + folder + fileName

                                        let fileContent = fs.readFileSync(fileToRead)
                                        let schemaDocument
                                        try {
                                            schemaDocument = JSON.parse(fileContent)
                                        } catch (err) {
                                            console.log('[ERROR] sendSchema -> Error Parsing JSON File: ' + fileToRead + ' .Error = ' + err.stack)
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent("[]", httpResponse)
                                            return
                                        }
                                        schemaArray.push(schemaDocument)
                                    }
                                    let schema = JSON.stringify(schemaArray)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(schema, httpResponse)
                                }
                            } catch (err) {
                                if (err.message.indexOf('no such file or directory') < 0) {
                                    console.log('Could not send Schema:', filePath, schemaType)
                                    console.log(err.stack)
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent("[]", httpResponse)
                            }
                        }
                    }
                    break
                case 'DirContent':
                    {
                        let folderPath = unescape(requestPath[2])
                        if (requestPath[3] !== undefined) {
                            folderPath = folderPath + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            folderPath = folderPath + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            folderPath = folderPath + '/' + requestPath[5]
                        }
                        let folder
                        if (requestPath[2] === 'Root') {
                            folder = folderPath.replace('Root', '../Superalgos/')
                        } else {
                            folder = global.env.PATH_TO_PROJECTS + '/' + folderPath
                        }

                        SA.projects.foundations.utilities.filesAndDirectories.getAllFilesInDirectoryAndSubdirectories(folder, onFilesReady)

                        function onFilesReady(files) {
                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(files), httpResponse)
                        }
                    }
                    break
                case 'IconNames':
                    {
                        let projects = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS)
                        let icons = []
                        let totalProjects = projects.length
                        let projectCounter = 0

                        for (let i = 0; i < projects.length; i++) {
                            let project = projects[i]

                            const folder = global.env.PATH_TO_PROJECTS + '/' + project + '/Icons/'

                            SA.projects.foundations.utilities.filesAndDirectories.getAllFilesInDirectoryAndSubdirectories(folder, onFilesReady)

                            function onFilesReady(files) {
                                for (let j = 0; j < files.length; j++) {
                                    let file = files[j]
                                    for (let i = 0; i < 10; i++) {
                                        file = file.replace('/', '\\')
                                    }
                                    icons.push([project, file])
                                }

                                projectCounter++
                                if (projectCounter === totalProjects) {
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(icons), httpResponse)
                                }
                            }
                        }
                    }
                    break
                case 'PluginFileNames':
                    {
                        processRequest()

                        async function processRequest(body) {
                            try {
                                let project = unescape(requestPath[2])
                                let folder = unescape(requestPath[3])

                                let response = await SA.projects.foundations.utilities.plugins.getPluginFileNames(
                                    project,
                                    folder
                                )

                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(response), httpResponse)

                            } catch (err) {
                                console.log('[ERROR] httpInterface -> PluginFileNames -> Method call produced an error.')
                                console.log('[ERROR] httpInterface -> PluginFileNames -> err.stack = ' + err.stack)
                                console.log('[ERROR] httpInterface -> PluginFileNames -> Params Received = ' + body)

                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'LoadPlugin':
                    {
                        processRequest()

                        async function processRequest(body) {
                            try {
                                let project = unescape(requestPath[2])
                                let folder = unescape(requestPath[3])
                                let fileName = unescape(requestPath[4])

                                let response = await SA.projects.foundations.utilities.plugins.getPluginFileContent(
                                    project,
                                    folder,
                                    fileName
                                ).catch(err => {
                                    let error = {
                                        result: 'Fail Because',
                                        message: err
                                    }
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    return
                                })

                                SA.projects.foundations.utilities.httpResponses.respondWithContent(response, httpResponse)

                            } catch (err) {
                                console.log('[ERROR] httpInterface -> LoadPlugin -> Method call produced an error.')
                                console.log('[ERROR] httpInterface -> LoadPlugin -> err.stack = ' + err.stack)
                                console.log('[ERROR] httpInterface -> LoadPlugin -> Params Received = ' + body)

                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'SavePlugin':
                    {
                        SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                        async function processRequest(body) {
                            try {
                                let plugin = JSON.parse(body)
                                let project = requestPath[2]
                                let folder = requestPath[3]
                                let fileName = requestPath[4]
                                let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/' + folder
                                let fileContent = JSON.stringify(plugin, undefined, 4)
                                const fs = SA.nodeModules.fs
                                fs.writeFileSync(filePath + '/' + fileName + '.json', fileContent)
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                            } catch (err) {
                                console.log('[ERROR] httpInterface -> SavePlugin -> Method call produced an error.')
                                console.log('[ERROR] httpInterface -> SavePlugin -> err.stack = ' + err.stack)
                                console.log('[ERROR] httpInterface -> SavePlugin -> Params Received = ' + body)

                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'Workspace.js':
                    {
                        let fs = SA.nodeModules.fs

                        try {
                            let filePath = global.env.PATH_TO_DEFAULT_WORKSPACE + '/Getting-Started-Tutorials.json'
                            fs.readFile(filePath, onFileRead)
                        } catch (e) {
                            console.log('[ERROR] Error reading the Workspace.', e)
                        }

                        function onFileRead(err, workspace) {
                            if (err) {
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(undefined, httpResponse)
                            } else {
                                let responseContent = 'function getWorkspace(){ return ' + workspace + '}'
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(responseContent, httpResponse)
                            }
                        }
                    }
                    break
                case 'ListWorkspaces':
                    {
                        let allWorkspaces = []
                        let projects = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS)
                        let projectsCount = 0

                        for (let i = 0; i < projects.length; i++) {
                            let project = projects[i]
                            readPluginWorkspaces()
                            function readPluginWorkspaces() {
                                let dirPath = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/Workspaces'
                                try {
                                    let fs = SA.nodeModules.fs
                                    fs.readdir(dirPath, onDirRead)

                                    function onDirRead(err, fileList) {
                                        let updatedFileList = []

                                        if (err) {
                                            /*
                                            If we have a problem reading this folder we will assume that it is
                                            because this project does not need this folder and that's it.
                                            */
                                            //console.log('[WARN] Error reading a directory content. filePath = ' + dirPath)
                                        } else {
                                            for (let i = 0; i < fileList.length; i++) {
                                                let name = 'Plugin \u2192 ' + fileList[i]
                                                updatedFileList.push([project, name])
                                            }
                                        }
                                        allWorkspaces = allWorkspaces.concat(updatedFileList)
                                        projectsCount++
                                        if (projectsCount === projects.length) {
                                            readMyWorkspaces()
                                        }
                                    }
                                } catch (err) {
                                    console.log('[ERROR] Error reading a directory content. filePath = ' + dirPath)
                                    console.log('[ERROR] err.stack = ' + err.stack)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }
                            }
                        }

                        function readMyWorkspaces() {
                            let dirPath = global.env.PATH_TO_MY_WORKSPACES
                            try {
                                let fs = SA.nodeModules.fs
                                fs.readdir(dirPath, onDirRead)

                                function onDirRead(err, fileList) {
                                    if (err) {
                                        // This happens the first time you run the software.
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                                        return
                                    } else {
                                        let updatedFileList = []
                                        for (let i = 0; i < fileList.length; i++) {
                                            let name = fileList[i]
                                            updatedFileList.push(['', name])
                                        }
                                        allWorkspaces = allWorkspaces.concat(updatedFileList)
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                                        return
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] Error reading a directory content. filePath = ' + dirPath)
                                console.log('[ERROR] err.stack = ' + err.stack)
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                return
                            }
                        }
                    }
                    break
                case 'LoadMyWorkspace':
                    {
                        let fileName = unescape(requestPath[2])
                        let filePath = global.env.PATH_TO_MY_WORKSPACES + '/' + fileName + '.json'
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(filePath, httpResponse)
                    }
                    break
                case 'SaveWorkspace':
                    {
                        SA.projects.foundations.utilities.httpRequests.getRequestBody(httpRequest, processRequest)

                        async function processRequest(body) {

                            let fileContent = body
                            let fileName = unescape(requestPath[2])
                            let filePath = global.env.PATH_TO_MY_WORKSPACES + '/' + fileName + '.json'

                            try {
                                let fs = SA.nodeModules.fs
                                let dir = global.env.PATH_TO_MY_WORKSPACES;

                                /* Create Dir if it does not exist */
                                if (!fs.existsSync(dir)) {
                                    fs.mkdirSync(dir);
                                }

                                fs.writeFile(filePath, fileContent, onFileWritten)

                                function onFileWritten(err) {
                                    if (err) {
                                        console.log('[ERROR] SaveWorkspace -> onFileWritten -> Error writing the Workspace file. fileName = ' + fileName)
                                        console.log('[ERROR] SaveWorkspace -> onFileWritten -> err.stack = ' + err.stack)
                                        let error = {
                                            result: 'Fail Because',
                                            message: err.message,
                                            stack: err.stack
                                        }
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                                    } else {
                                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    }
                                }

                            } catch (err) {
                                console.log('[ERROR] SaveWorkspace -> Error writing the Workspace file. fileName = ' + fileName)
                                console.log('[ERROR] SaveWorkspace -> err.stack = ' + err.stack)
                                let error = {
                                    result: 'Fail Because',
                                    message: err.message,
                                    stack: err.stack
                                }
                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(error), httpResponse)
                            }
                        }
                    }
                    break
                case 'ProjectsSchema':
                    {
                        let path = global.env.PATH_TO_PROJECTS + '/' + 'ProjectsSchema.json'
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(path, httpResponse)
                    }
                    break
                case 'ListSpaceFiles':
                    {
                        let fs = SA.nodeModules.fs
                        let allFiles = []
                        let projects = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS)
                        let dirCount = 0
                        let totalDirs = 0

                        for (let i = 0; i < projects.length; i++) {
                            let project = projects[i]

                            let dirPath = project + '/UI/Spaces'
                            let spaces = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS + '/' + dirPath)

                            for (let j = 0; j < spaces.length; j++) {
                                let space = spaces[j]
                                readDirectory(dirPath + '/' + space)
                            }

                            function readDirectory(path) {
                                try {

                                    totalDirs++
                                    fs.readdir(global.env.PATH_TO_PROJECTS + '/' + path, onDirRead)

                                    let otherDirs = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS + '/' + path)
                                    for (let m = 0; m < otherDirs.length; m++) {
                                        let otherDir = otherDirs[m]
                                        readDirectory(path + '/' + otherDir)
                                    }

                                    function onDirRead(err, fileList) {
                                        if (err) {
                                            SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                        } else {
                                            let updatedFileList = []
                                            for (let k = 0; k < fileList.length; k++) {
                                                let name = fileList[k]
                                                if (name.indexOf('.js') < 0) { continue }
                                                updatedFileList.push(path + '/' + name)
                                            }
                                            allFiles = allFiles.concat(updatedFileList)
                                            dirCount++
                                            if (dirCount === totalDirs) {
                                                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allFiles), httpResponse)
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.log('[ERROR] Error reading a directory content. filePath = ' + path)
                                    console.log('[ERROR] err.stack = ' + err.stack)
                                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }
                            }
                        }
                    }
                    break
                case 'ListFunctionLibraries':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithProjectFolderFileList(httpResponse, 'Function-Libraries', 'UI')
                    }
                    break
                case 'ListUtilitiesFiles':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithProjectFolderFileList(httpResponse, 'Utilities', 'UI')
                    }
                    break
                case 'ListGlobalFiles':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithProjectFolderFileList(httpResponse, 'Globals', 'UI')
                    }
                    break
                case 'Projects':
                    {
                        let path = ''
                        for (let i = 2; i < 10; i++) {
                            if (requestPath[i] !== undefined) {
                                let parameter = unescape(requestPath[i])
                                path = path + '/' + parameter
                            }

                        }
                        let filePath = global.env.PATH_TO_PROJECTS + path
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(filePath, httpResponse)
                    }
                    break
                case 'Storage':
                    {
                        let pathToFile = httpRequest.url.substring(9)
                        /* Unsavping # */
                        for (let i = 0; i < 10; i++) {
                            pathToFile = pathToFile.replace('_HASHTAG_', '#')
                        }
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(global.env.PATH_TO_DATA_STORAGE + '/' + pathToFile, httpResponse)
                    }
                    break
                default:
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithWebFile(httpResponse, endpointOrFile,  global.env.PATH_TO_CLIENT)
                    }
            }
        } catch (err) {
            console.log(err.stack)
        }
    }
}
