import authenticate from './authenticate.js';

// 상품 목록·상세처럼 로그인 여부와 관계없이 사용할 수 있는 API에 연결한다.
// 토큰이 있으면 authenticate.js가 req.user를 만들고, 없으면 비회원으로 통과시킨다.
const optionalAuthenticate = (req, res, next) => {
  if (!req.get('Authorization')) {
    req.user = null;
    return next();
  }

  return authenticate(req, res, next);
};

export default optionalAuthenticate;
