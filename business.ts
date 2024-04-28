import puppeteer, {Browser} from 'puppeteer';
// import { Level } from 'level'

// const db = new Level('db', {valueEncoding: 'json'})

// function generateRandomString(length: number): string {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//     let result = '';
//     const charactersLength = characters.length;
//     for (let i = 0; i < length; i++) {
//         result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
// }

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

export class Business {

    syncing: boolean = false

    cookie: any | undefined

    getBrowser = async () => {
        const browser = await puppeteer.connect({
            browserWSEndpoint: 'ws://127.0.0.1:3000',
        })

        // local browser need use <page.waitForNavigation()>
        // const browser = await puppeteer.launch({
        //     headless: 'new'
        // });
        return browser
    }

    syncCookie = async (cookie: string, account: string, headers: any) => {

        while (this.syncing == true) {
            await sleep(500)
        }

        if (this.cookie != undefined) {
            return {
                code: 1,
                cookie: this.cookie
            }
        }

        this.syncing = true
        

        console.log('syncCookie')
        console.log('cookie', cookie)
        console.log('account', account)

        //check state
        const browser = await this.getBrowser()
        let page = await browser.newPage()

        await page.setExtraHTTPHeaders({
            'Cookie': cookie
        })

        console.log('created page')
        await page.goto(`${process.env.SERVER_PROXY_URL}`)
        console.log('goto')

        let title = await page.title()
        console.log('title', title)
        let url = page.url()
        console.log('url', url)

        try {
            await page.waitForNavigation()
        } catch (error) {
            console.log('waitForNavigation not end')
        }
        
        title = await page.title()
        console.log('title', title)
        url = page.url()
        console.log('url', url)

        if (url.endsWith('auth') || url.endsWith('signup')) {
            console.log('hit create or login')
        } else {
            this.syncing = false
            await browser.close()
            return {
                code: 0,
                message: 'logined',
                cookie: undefined
            }
        }

        //check db
        // let passowrd: string | undefined = undefined
        // try {
        //     passowrd = await db.get(`account-${account}`)
        // } catch (error) {
        //     passowrd = undefined
        // } 

        // console.log('passowrd', passowrd)

        const login = async () => {
            //login account
            await page.setExtraHTTPHeaders({
                'user-agent': headers['user-agent']
            })
            await page.goto(`${process.env.SERVER_PROXY_URL}/auth`)

            try {
                await page.waitForNavigation()
            } catch (error) {
                console.log('waitForNavigation not end')
            }
            

            await page.type('#email', `${account}@bytebase.snowinning.com`);
            await page.type('#password', process.env.PASSWORD as string)

            await page.waitForSelector('[type="submit"]');
            const [responseSubmit] = await Promise.all([
                page.waitForNavigation(),
                page.click('[type="submit"]')
            ]);
            console.log('responseSubmit', responseSubmit)
            console.log('submit')

            // await page.waitForNavigation()
            // let htmlContent = await page.content()
            console.log(await page.title())
            // console.log('htmlContent', htmlContent)

            const currentCookies = await page.cookies();
            console.log('currentCookies', currentCookies);


            if (currentCookies.length > 0) {
                
                this.cookie = currentCookies
                setTimeout(() => {
                    this.cookie = undefined
                }, 30 * 1000);
                this.syncing = false

                await browser.close()
                return {
                    code: 1,
                    cookie: currentCookies
                }
            }
    
            this.syncing = false
            await browser.close()
            return {
                code: -1,
                message: 'state error',
                cookie: undefined
            }
        }


        //create account

        // let pwd = generateRandomString(12)
        // let a = `${account}${generateRandomString(4)}`

        await page.setExtraHTTPHeaders({
            'user-agent': headers['user-agent']
        })
        await page.goto(`${process.env.SERVER_PROXY_URL}/auth/signup`)
        try {
            await page.waitForNavigation()
        } catch (error) {
            console.log('waitForNavigation not end')
        }

        const checkElement = await page.$('[type="checkbox"]');
        if (!checkElement){
            console.log('do login')
            return await login()
        }
        

        await page.type('#email', `${account}@bytebase.snowinning.com`);
        await page.type('#password', process.env.PASSWORD as string)
        await page.type('#password-confirm', process.env.PASSWORD as string)
        await page.type('#name', account)
        console.log('input')

        try {
            await page.waitForSelector('[type="checkbox"]');
        } catch (error) {
            console.log('error', error)
            console.log('do login')
            return await login()
        }
        
        const [responseCheck] = await Promise.all([
            // page.waitForNavigation(),
            page.click('[type="checkbox"]')
        ]);

        console.log('checkbox', responseCheck)

        await page.waitForSelector('[type="submit"]');
        const [responseSubmit] = await Promise.all([
            page.waitForNavigation(),
            page.click('[type="submit"]')
        ]);

        console.log('submit', responseSubmit)

        // await page.click('[type="submit"]');
        // console.log('submit')
        // await page.waitForNavigation()


        // let htmlContent = await page.content()
        console.log(await page.title())
        // console.log('htmlContent', htmlContent)

        const currentCookies = await page.cookies();
        console.log('currentCookies', currentCookies);

        if (currentCookies.length > 0) {

            this.cookie = currentCookies
            setTimeout(() => {
                this.cookie = undefined
            }, 30 * 1000);
            this.syncing = false

            await browser.close()
            return {
                code: 1,
                cookie: currentCookies,
                message: undefined
            }
        }

        this.syncing = false
        await browser.close()
        return {
            code: -1,
            message: 'state error',
            cookie: undefined
        }
        //return cookie
    }
}

export const business = new Business()

// business.syncCookie('', 'a3')