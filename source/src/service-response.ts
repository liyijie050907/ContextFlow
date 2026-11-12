// Do not expose raw error pages: proxies can include request details in HTML.
export async function serviceJSON(response:Response,path:string):Promise<any>{
 const text=await response.text();
 if(response.status>=500&&/^\s*</.test(text))throw Error(`查询服务暂时不可用（HTTP ${response.status}，${path}）。请稍后重试；已有词义和学习数据保留。这不是模型密钥无效的提示。`);
 if(/^\s*</.test(text))throw Error(`网站后台未正确连接（${path} 返回网页，HTTP ${response.status}）。静态托管只提供阅读页面；Cloudflare 请使用 cloudflare/ 目录部署 Pages Functions，或运行 deploy/ 中的 Node 后台。仅上传网页不能使用 AI 功能。`);
 let value;try{value=JSON.parse(text);}catch{throw Error(`网站后台返回了无效 JSON（${path}，HTTP ${response.status}），请检查后台服务及 /api/* 转发。`);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`网站后台返回格式不正确（${path}），请更新前端和后台到相同版本。`);
 return value;
}
