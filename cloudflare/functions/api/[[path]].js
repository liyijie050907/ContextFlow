import {handleCloudflare} from '../../runtime.mjs';
export const onRequest=({request,env})=>handleCloudflare(request,env);
