
 const worker_export_default= {
   async fetch(request :Request, env :Record<string, string>, ctx :EventContext<Record<string, string>, any, Record<string, unknown>>) {
     try {
       const url = new URL(request.url);
       const sourceUrl = url.searchParams.get("url");
       const orderMode = url.searchParams.get("order") || "auto";
 
       if (!sourceUrl) {
         return json({
           ok: false,
           error: "Missing ?url parameter"
         }, 400);
       }
 
       let resolvedUrl;
       try {
         resolvedUrl = mutateShareUrl(sourceUrl);
       } catch (e :any) {
         return json({
           ok: false,
           error: "URL mutation failed",
           details: e.message
         }, 400);
       }
 
       let upstreamRes;
       try {
         upstreamRes = await fetch(resolvedUrl, {
           headers: {
             "user-agent": "JoPilot/0.1"
           }
         });
       } catch (e :any) {
         return json({
           ok: false,
           error: "Fetch failed",
           details: e.message,
           resolved: resolvedUrl
         }, 502);
       }
 
       let rawText = await upstreamRes.text();
 
       let data;
       try {
         data = JSON.parse(rawText);
       } catch (e) {
         // Not JSON? Return raw.
         return new Response(rawText, {
           status: 200,
           headers: baseHeaders("text/plain")
         });
       }
 
       let messages = data?.messages;
 
       let ordered = false;
 
       if (Array.isArray(messages)) {
         const result = maybeChronOrder(messages, orderMode);
         messages = result.messages;
         ordered = result.changed;
       }
 
       return json({
         ok: true,
         source: sourceUrl,
         resolved: resolvedUrl,
         ordered,
         messageCount: Array.isArray(messages) ? messages.length : null,
         messages
       });
 
     } catch (err :any) {
       return json({
         ok: false,
         error: "Unhandled exception",
         details: err.message
       }, 500);
     }
   }
 };
 
 
 /* --------------------------
    Helpers
 -------------------------- */
 
 function json(obj :any, status = 200) {
   return new Response(JSON.stringify(obj, null, 2), {
     status,
     headers: baseHeaders("application/json")
   });
 }
 
 function baseHeaders(contentType :any) {
   return {
     "content-type": contentType,
     "access-control-allow-origin": "*"
   };
 }
 
 
 /* --------------------------
    URL mutation (VERIFY THIS)
 -------------------------- */
 
 function mutateShareUrl(url :any) {
   // Example placeholder logic — replace with your discovered pattern
 
   // Common pattern: change `/shares/...` → `/api/...` or similar
   if (url.includes("/shares/")) {
     return url.replace("/shares/", "/c/api/conversations/shares/");
   }
 
   // Fallback: return as-is (or throw)
   return url;
 }
 
 
 /* --------------------------
    Ordering logic
 -------------------------- */
 
 function maybeChronOrder(messages :any, mode :any) {
   if (mode === "none") {
     return { messages, changed: false };
   }
 
   if (!Array.isArray(messages) || messages.length < 2) {
     return { messages, changed: false };
   }
 
   const first = Date.parse(messages[0]?.createdAt || 0);
   const last  = Date.parse(messages[messages.length - 1]?.createdAt || 0);
 
   if (isNaN(first) || isNaN(last)) {
     return { messages, changed: false };
   }
 
   let shouldReverse = false;
 
   if (mode === "auto") {
     shouldReverse = first > last;
   } else if (mode === "asc") {
     shouldReverse = first > last;
   } else if (mode === "desc") {
     shouldReverse = first < last;
   }
 
   if (shouldReverse) {
     return {
       messages: [...messages].reverse(),
       changed: true
     };
   }
 
   return { messages, changed: false };
 }

 export async function onRequest(ctx :EventContext<Record<string, string>, any, Record<string, unknown>>) {
     return await worker_export_default.fetch(ctx.request, ctx.env, ctx)                                  }

