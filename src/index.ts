import keywords from "../keywords.json";

export default {
  async fetch(request: Request): Promise<Response> {
    // CORS 에러 방지를 위한 헤더 설정
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-mcp-protocol-version"
    };

    // 브라우저 및 클라이언트의 Preflight(OPTIONS) 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    try {
      const url = new URL(request.url);

      // 1. MCP 프로토콜 초기화 및 기능 조회 단계 (GET / 또는 특정 경로)
      if (request.method === "GET") {
        // 클라이언트가 MCP 서버에 연결을 시도할 때 (초기 핸드셰이크)
        return new Response(
          JSON.stringify({
            mcpVersion: "2024-11-05",
            capabilities: {
              tools: {} // 이 서버는 'Tools' 기능을 제공함을 선언
            },
            serverInfo: {
              name: "fillet-chamfer-mcp-edu",
              version: "1.0.0"
            }
          }),
          { headers, status: 200 }
        );
      }

      // 2. 핵심 로직 처리 단계 (POST 요청)
      if (request.method === "POST") {
        const body: any = await request.json();

        // 2-a. 클라이언트가 사용 가능한 도구(Tools) 목록을 요청할 때
        if (body.method === "tools/list") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                tools: [
                  {
                    name: "get_mechanical_guideline",
                    description: "기계가공(Fillet 또는 Chamfer)에 대한 안전 가이드라인 규칙을 조회합니다.",
                    inputSchema: {
                      type: "object",
                      properties: {
                        keyword: {
                          type: "string",
                          description: "조회할 키워드 (예: fillet, chamfer)"
                        }
                      },
                      required: ["keyword"]
                    }
                  }
                ]
              }
            }),
            { headers, status: 200 }
          );
        }

        // 2-b. 클라이언트가 실제로 도구(Tool)를 실행했을 때
        if (body.method === "tools/call") {
          const { keyword } = body.params.arguments || {};
          const lowerKeyword = keyword ? keyword.toLowerCase() : "";

          // JSON 데이터에서 학생이 수정한 키워드가 있는지 매칭
          const matchedData = keywords[lowerKeyword as keyof typeof keywords];

          let responseText = "";
          if (matchedData) {
            responseText = `[${matchedData.description}]\n${matchedData.content}`;
          } else {
            responseText = `'${keyword}'에 대한 가이드라인을 찾을 수 없습니다. 현재 등록된 키워드: ${Object.keys(keywords).join(", ")}`;
          }

          // MCP 규격에 맞춘 결과 반환
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: responseText
                  }
                ],
                isError: false
              }
            }),
            { headers, status: 200 }
          );
        }
      }

      // 정의되지 않은 요청에 대한 예외 처리
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { headers, status: 405 });

    } catch (error: any) {
      // 서버 내부 에러 발생 시 처리
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: error.message } }),
        { headers, status: 500 }
      );
    }
  }
};
