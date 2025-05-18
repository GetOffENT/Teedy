package com.sismics.docs.rest.resource;

import com.sismics.docs.core.constant.Constants;
import com.sismics.docs.core.dao.UserDao;
import com.sismics.docs.core.model.jpa.User;
import com.sismics.docs.rest.constant.BaseFunction;
import com.sismics.rest.exception.ClientException;
import com.sismics.rest.exception.ForbiddenClientException;
import com.sismics.rest.exception.ServerException;
import com.sismics.rest.util.ValidationUtil;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObjectBuilder;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Path("/register/request")
@Produces(MediaType.APPLICATION_JSON)
public class UserRegistrationRequestResource extends BaseResource {
    private static final Map<Long, RegistrationRequest> REQUESTS = new ConcurrentHashMap<>();
    private static final AtomicLong ID_GENERATOR = new AtomicLong(1);

    private static class RegistrationRequest {
        long id;
        String username;
        String email;
        String password;
        String reason;
        String storageQuota;
        String status; // pending/accepted/rejected
        String processReason;

        @Override
        public String toString() {
            return "RegistrationRequest{" +
                    "id=" + id +
                    ", username='" + username + '\'' +
                    ", email='" + email + '\'' +
                    ", password='" + password + '\'' +
                    ", reason='" + reason + '\'' +
                    ", storageQuota='" + storageQuota + '\'' +
                    ", status='" + status + '\'' +
                    ", processReason='" + processReason + '\'' +
                    '}';
        }
    }

    // 访客提交注册申请
    @POST
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response createRequest(@FormParam("username") String username,
                                  @FormParam("email") String email,
                                  @FormParam("password") String password,
                                  @FormParam("reason") String reason,
                                  @FormParam("storage_quota") String storageQuota) {
        // 简单校验
        if (username == null || email == null || password == null || reason == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Json.createObjectBuilder().add("error", "参数不能为空").build()).build();
        }
        RegistrationRequest req = new RegistrationRequest();
        req.id = ID_GENERATOR.getAndIncrement();
        req.username = username;
        req.email = email;
        req.password = password;
        req.reason = reason;
        req.storageQuota = storageQuota;
        req.status = "pending";
        REQUESTS.put(req.id, req);

        // 输出日志到控制台
        System.out.printf("New registration request: %s, %s, %s, %s, %s%n", username, email, password, reason, storageQuota);
        return Response.ok(Json.createObjectBuilder().add("status", "ok").build()).build();
    }

    // 管理员获取所有待审核申请
    @GET
    public Response listRequests() {
        JsonArrayBuilder arr = Json.createArrayBuilder();
        for (RegistrationRequest req : REQUESTS.values()) {
            if ("pending".equals(req.status)) {
                arr.add(Json.createObjectBuilder()
                        .add("id", req.id)
                        .add("username", req.username)
                        .add("email", req.email)
                        .add("reason", req.reason)
                        .add("storage_quota", req.storageQuota)
                );
            }
        }
        return Response.ok(Json.createObjectBuilder().add("requests", arr).build()).build();
    }

    // 管理员同意申请
    @POST
    @Path("accept/{id}")
    public Response acceptRequest(@PathParam("id") long id) {
        RegistrationRequest req = REQUESTS.get(id);
        if (req == null || !"pending".equals(req.status)) {
            return Response.status(Response.Status.NOT_FOUND).entity(Json.createObjectBuilder().add("error", "申请不存在或已处理").build()).build();
        }
        String username = req.username, password = req.password, email = req.email, storageQuotaStr = req.storageQuota;
        if (!authenticate()) {
            throw new ForbiddenClientException();
        }
        checkBaseFunction(BaseFunction.ADMIN);

        // Validate the input data
        username = ValidationUtil.validateLength(username, "username", 3, 50);
        ValidationUtil.validateUsername(username, "username");
        password = ValidationUtil.validateLength(password, "password", 8, 50);
        email = ValidationUtil.validateLength(email, "email", 1, 100);
        Long storageQuota = ValidationUtil.validateLong(storageQuotaStr, "storage_quota");
        ValidationUtil.validateEmail(email, "email");

        // Create the user
        User user = new User();
        user.setRoleId(Constants.DEFAULT_USER_ROLE);
        user.setUsername(username);
        user.setPassword(password);
        user.setEmail(email);
        user.setStorageQuota(storageQuota);
        user.setOnboarding(true);

        // Create the user
        UserDao userDao = new UserDao();
        try {
            userDao.create(user, principal.getId());
        } catch (Exception e) {
            if ("AlreadyExistingUsername".equals(e.getMessage())) {
                throw new ClientException("AlreadyExistingUsername", "Login already used", e);
            } else {
                throw new ServerException("UnknownError", "Unknown server error", e);
            }
        }

        req.status = "accepted";

        // Always return OK
        JsonObjectBuilder response = Json.createObjectBuilder()
                .add("status", "ok");
        return Response.ok().entity(response.build()).build();
    }

    // 管理员拒绝申请
    @POST
    @Path("reject/{id}")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response rejectRequest(@PathParam("id") long id, @FormParam("reason") String processReason) {
        RegistrationRequest req = REQUESTS.get(id);
        if (req == null || !"pending".equals(req.status)) {
            return Response.status(Response.Status.NOT_FOUND).entity(Json.createObjectBuilder().add("error", "申请不存在或已处理").build()).build();
        }
        req.status = "rejected";
        req.processReason = processReason;
        return Response.ok(Json.createObjectBuilder().add("status", "ok").build()).build();
    }
}
