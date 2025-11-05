# AI Quiz Backend - Todo List

## ✅ DONE

- ✅ Admin Signup (POST /auth/admin/signup)
- ✅ User Signup (POST /auth/user/signup)
- ✅ Signin for both admin and user (POST /auth/signin)
- ✅ Token refresh endpoint (POST /auth/refresh)
- ✅ Logout (POST /auth/logout)
- ✅ Update profile (PUT /user/profile)
- ✅ Get User Session (GET /user/session)
- ✅ Revoke All Sessions (POST /auth/revoke-all)
- ✅ Upload PDF to R2 (POST /upload/pdf)
- ✅ Create Subject (POST /admin/subject)
- ✅ Create Entrance Exam (POST /admin/entrance-exam)
- ✅ Create AI Questions (POST /admin/questions/ai)

## 🔄 PENDING - Priority Order

### Phase 1: Admin Test Management (Do First)

1. 🔄 Create Test (POST /admin/test) - **START HERE** DONE
2. 🔄 Get Available Tests (GET /user/tests) - **NEXT**
3. 🔄 Get Test Details (GET /user/test/:testId) - **THEN**

### Phase 2: Core Test Flow (Do Second)

4. 🔄 Start Test (POST /user/test/start) - **THEN**
5. 🔄 Get Test Questions (GET /user/test/:testId/questions) - **THEN**
6. 🔄 Submit Answer (POST /user/test/answer) - **THEN**
7. 🔄 End Test (POST /user/test/end) - **THEN**
8. 🔄 Calculate Score (Internal - happens in End Test) - **THEN**
9. 🔄 Store User Test Result (Internal - happens in End Test) - **THEN**

### Phase 3: User Features (Do Third)

10. 🔄 Test History (GET /user/test-history)
11. 🔄 User Progress (GET /user/progress)

### Phase 4: Admin Management (Do Last)

12. 🔄 View All Users (GET /admin/users)
13. 🔄 View User Details (GET /admin/users/:userId)
14. 🔄 View User Progress (GET /admin/users/:userId/progress)
15. 🔄 View All Test Attempts (GET /admin/test-attempts)
16. 🔄 View Test Results (GET /admin/test-results)
17. 🔄 Delete Subject (DELETE /admin/subject/:subjectId)
18. 🔄 Edit Subject (PUT /admin/subject/:subjectId)
19. 🔄 Delete Question (DELETE /admin/question/:questionId)
20. 🔄 Edit Question (PUT /admin/question/:questionId)
21. 🔄 Delete Test (DELETE /admin/test/:testId)
22. 🔄 Edit Test (PUT /admin/test/:testId)
