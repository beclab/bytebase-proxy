import httpProxy from 'http-proxy';
import { business } from './business';
import { Protocol } from 'puppeteer';

const SERVER_PROXY_URL = process.env.SERVER_PROXY_URL
const SERVER_PROXY_DOMAIN = process.env.SERVER_PROXY_DOMAIN
const THIS_DOMAIN = process.env.THIS_DOMAIN

const proxy = httpProxy.createProxyServer(
    {
        target: SERVER_PROXY_URL,
        headers: {
            host: SERVER_PROXY_DOMAIN as string,
        },
        selfHandleResponse: true
    }
).listen(8001);

const cookieHolder: {
    cookie: Protocol.Network.Cookie[] | undefined
    time: number | undefined
} = {
    cookie: undefined,
    time: undefined
}

proxy.on('proxyReq', async (proxyReq, req, res, options) => {
    console.log('on proxyReq')
    // console.log('proxyReq', proxyReq)
    // console.log('req', req)
    // console.log('res', res)
    // console.log('options', options)

    const cookie = proxyReq.getHeader('cookie')
    console.log('cookie', cookie)
})

proxy.on('proxyRes', async (proxyRes, req, res) => {
    console.log('on proxyRes')
    // console.log('proxyRes', proxyRes)
    // console.log('req', req)
    // console.log('res', res)

    const cookie = req.headers.cookie
    console.log('req cookie', cookie)
    const xhost = req.headers['x-forwarded-host']
    console.log('xhost', xhost)
    const cookies = cookie?.split(';')

    if (cookies == undefined || cookieHolder.cookie == undefined) {
        console.log('cookies', cookies)
        console.log('cookieHolder.cookie', cookieHolder.cookie)
        //sync 
        let user = req.headers['x-bfl-user'] as string
        let resp = await business.syncCookie('', user, req.headers)

        if (resp.code == 0 || resp.cookie == undefined) {
            // throw new Error("state error");
            console.error('state error resp.code == 0 || resp.cookie == undefined')
            return
        }

        cookieHolder.cookie = resp.cookie
        cookieHolder.time = new Date().getTime()
        
        if (THIS_DOMAIN == undefined) {
            // throw new Error("not found THIS_DOMAIN");
            console.error("not found THIS_DOMAIN")
            return 
        }

        let domainThis: string[] = THIS_DOMAIN.split('.') as string[]
        let localDomainThis: string[] = [domainThis[0], 'local', ...domainThis?.slice(1)]

        //set cookie 
        let newArr: string[] = []

        if (cookieHolder.cookie == undefined) {
            // throw new Error("state error");
            console.error("cookieHolder.cookie == undefined")
            return
        }

        for (const c of cookieHolder.cookie) {
            const date: Date = new Date(c.expires * 1000);
            newArr.push(`${c.name}=${c.value};domain=${THIS_DOMAIN};path=${c.path};${c.httpOnly == true ? 'httpOnly' : ''};${c.secure == true ? 'secure' : ''};sameSite=${c.sameSite},expires=${date.toUTCString()};`)
            newArr.push(`${c.name}=${c.value};domain=${localDomainThis.join('.')};path=${c.path};${c.httpOnly == true ? 'httpOnly' : ''};${c.secure == true ? 'secure' : ''};sameSite=${c.sameSite},expires=${date.toUTCString()};`)
        }
        
        let headers = {
            'set-cookie': newArr,
            'location': `https://${xhost}`
        }
        //重定向
        res.writeHead(302, '', headers)
        res.end()
        return

    } else {
        let hit_c = 0
        for (const c of cookies) {
            let values = c.split('=')
            for (const cc of cookieHolder.cookie as any[]) {
                console.log('c', c)
                console.log('cc', cc)

                console.log('values[0].replace', values[0].replace(' ', ''))
                console.log('cc.name.replace', cc.name.replace(' ', ''))

                if (cc.name.replace(' ', '') == values[0].replace(' ', '')) {
                    console.log('cc.expires', cc.expires)
                    console.log('new Date().getTime()', new Date().getTime())
                    if (cc.expires * 1000 > new Date().getTime()) {
                        hit_c++
                    }
                }
            } 
        }
        console.log('hit_c', hit_c)
        if (hit_c == (cookieHolder.cookie as any[]).length) {
            // pass
            console.log('hit_c pass')
        } else {
            //sync 
            console.log('re sync cookie')
            let user = req.headers['x-bfl-user'] as string
            let resp = await business.syncCookie(req.headers['cookie'] ? req.headers['cookie'] : '', user, req.headers)

            if (resp.code != 0 && resp.cookie != undefined) {
                cookieHolder.cookie = resp.cookie
                cookieHolder.time = new Date().getTime()
                
                //set cookie 
                let newArr: string[] = []
        
                if (cookieHolder.cookie == undefined) {
                    // throw new Error("state error");
                    console.error('state error cookieHolder.cookie == undefined')
                    return
                }

                if (THIS_DOMAIN == undefined) {
                    // throw new Error("not found THIS_DOMAIN");
                    console.error("not found THIS_DOMAIN")
                    return 
                }

                let domainThis: string[] = THIS_DOMAIN.split('.') as string[]
                let localDomainThis: string[] = [domainThis[0], 'local', ...domainThis?.slice(1)]

                for (const c of cookieHolder.cookie) {
                    const date: Date = new Date(c.expires * 1000);

                    newArr.push(`${c.name}=${c.value};domain=${THIS_DOMAIN};path=${c.path};${c.httpOnly == true ? 'httpOnly' : ''};${c.secure == true ? 'secure' : ''};sameSite=${c.sameSite},expires=${date.toUTCString()};`)
                    newArr.push(`${c.name}=${c.value};domain=${localDomainThis.join('.')};path=${c.path};${c.httpOnly == true ? 'httpOnly' : ''};${c.secure == true ? 'secure' : ''};sameSite=${c.sameSite},expires=${date.toUTCString()};`)
                }
                
                let headers = {
                    'set-cookie': newArr,
                    'location': `https://${xhost}`
                }
                //重定向
                res.writeHead(302, '', headers)
                res.end()
                return
            }



        }

    }



    // This project uses front-end routing, and there is no redirection function on the server side
    // console.log('proxyRes.statusCode', proxyRes.statusCode)
    // if (proxyRes.statusCode == 302) {
    //     console.log('proxyRes.headers.location', proxyRes.headers.location)
    // }

    const newHeader = {}
    res.writeHead(proxyRes.statusCode ? proxyRes.statusCode : 404, proxyRes.statusMessage, Object.assign({}, proxyRes.headers, newHeader))

    let body: any[] = [];
    
    proxyRes.on('data', function (chunk: any) {
        body.push(chunk);
    });
    proxyRes.on('end', function () {
        
        // res.write("");
        res.write(Buffer.concat(body))
        res.end()
        // res.end("my response to cli");

        console.log('proxyRes on end')
    });
})