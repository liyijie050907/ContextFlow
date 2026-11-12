// Do not expose raw error pages: proxies can include request details in HTML.
export async function serviceJSON(response:Response,path:string):Promise<any>{
 const text=await response.text();
 if(/^\s*</.test(text))throw Error(`网站后台未正确连接（${path} 返回网页，HTTP ${response.status}）。静态托管只提供阅读页面；AI 功能需要运行 deploy/server.mjs 并将 /api/* 转发到后台。Cloudflare Pages 仅上传网页不能运行此后台。`);
 let value;try{value=JSON.parse(text);}catch{throw Error(`网站后台返回了无效 JSON（${path}，HTTP ${response.status}），请检查后台服务及 /api/* 转发。`);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`网站后台返回格式不正确（${path}），请更新前端和后台到相同版本。`);
 return value;
}
