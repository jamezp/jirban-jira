/*
 * JBoss, Home of Professional Open Source.
 * Copyright 2016, Red Hat, Inc., and individual contributors
 * as indicated by the @author tags. See the copyright.txt file in the
 * distribution for a full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package org.jirban.jira.impl;

import static org.jirban.jira.impl.Constants.CODE;
import static org.jirban.jira.impl.Constants.ID;
import static org.jirban.jira.impl.Constants.NAME;
import static org.jirban.jira.impl.Constants.RANK_CUSTOM_FIELD;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.beans.PropertyChangeListener;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.jboss.dmr.ModelNode;
import org.jirban.jira.api.BoardConfigurationManager;
import org.jirban.jira.impl.activeobjects.BoardCfg;
import org.jirban.jira.impl.activeobjects.Setting;
import org.junit.Assert;

import com.atlassian.activeobjects.external.ActiveObjects;
import com.atlassian.jira.config.IssueTypeManager;
import com.atlassian.jira.config.PriorityManager;
import com.atlassian.jira.project.ProjectManager;
import com.atlassian.jira.security.GlobalPermissionManager;
import com.atlassian.jira.security.PermissionManager;
import com.atlassian.sal.api.transaction.TransactionCallback;

import electric.soap.rpc.In;
import net.java.ao.EntityManager;
import net.java.ao.Query;
import net.java.ao.RawEntity;
import ut.org.jirban.jira.mock.GlobalPermissionManagerBuilder;
import ut.org.jirban.jira.mock.IssueTypeManagerBuilder;
import ut.org.jirban.jira.mock.PermissionManagerBuilder;
import ut.org.jirban.jira.mock.PriorityManagerBuilder;

/**
 * @author Kabir Khan
 */
public class BoardConfigurationManagerBuilder {

    private final ActiveObjects activeObjects = mock(ActiveObjects.class);
    private final ProjectManager projectManager = mock(ProjectManager.class);


    private IssueTypeManager issueTypeManager = IssueTypeManagerBuilder.getDefaultIssueTypeManager();
    private PriorityManager priorityManager = PriorityManagerBuilder.getDefaultPriorityManager();
    private PermissionManager permissionManager = PermissionManagerBuilder.getAllowsAll();
    private GlobalPermissionManager globalPermissionManager = GlobalPermissionManagerBuilder.getAllowsAll();

    private Map<String, ModelNode> activeObjectEntries = new HashMap<>();

    public BoardConfigurationManagerBuilder addConfigActiveObjectsFromFile(String... resources) throws IOException {
        for (String resource : resources) {
            ModelNode entry = loadConfig(resource);
            addConfigActiveObject(entry.get(CODE).asString(), entry);
        }
        return this;
    }

    public BoardConfigurationManagerBuilder addSettingActiveObject(String name, String value) {
        final ModelNode setting = new ModelNode();
        setting.get(NAME).set(name);
        setting.get(ID).set(value);
        return addConfigActiveObject(name, setting);
    }

    public BoardConfigurationManagerBuilder addConfigActiveObject(String name, ModelNode activeObject) {
        activeObjectEntries.put(name, activeObject);
        return this;
    }

    public BoardConfigurationManagerBuilder setPriorityManager(PriorityManager priorityManager) {
        this.priorityManager = priorityManager;
        return this;
    }

    public BoardConfigurationManagerBuilder setIssueTypeManager(IssueTypeManager issueTypeManager) {
        this.issueTypeManager = issueTypeManager;
        return this;
    }

    public BoardConfigurationManagerBuilder setPermissionManager(PermissionManager permissionManager) {
        this.permissionManager = permissionManager;
        return this;
    }

    public BoardConfigurationManagerBuilder setGlobalPermissionManager(GlobalPermissionManager globalPermissionManager) {
        this.globalPermissionManager = globalPermissionManager;
        return this;
    }

    public BoardConfigurationManager build() {
        when(activeObjects.executeInTransaction(any(TransactionCallback.class))).thenAnswer(invocation -> ((TransactionCallback)invocation.getArguments()[0]).doInTransaction());
        when(activeObjects.find(any(Class.class), any(Query.class))).thenAnswer(invocation -> {
            Object[] args = invocation.getArguments();
            Class<?> clazz = (Class<?>)args[0];
            if (clazz == BoardCfg.class) {
                Query query = (Query) args[1];
                if (query.getWhereClause().equals("code = ?") && query.getWhereParams().length == 1) {
                    ModelNode entry = activeObjectEntries.get(query.getWhereParams()[0]);
                    if (entry != null) {
                        return new BoardCfg[]{new MockBoardCfg("kabir", entry).boardCfg};
                    }
                }
                return new BoardCfg[0];
            } else if (clazz == Setting.class) {
                Query query = (Query) args[1];
                if (query.getWhereClause().equals("name = ?") && query.getWhereParams().length == 1) {
                    ModelNode entry = activeObjectEntries.get(query.getWhereParams()[0]);
                    if (entry != null) {
                        return new Setting[]{new MockSetting(entry.get(NAME).asString(), entry.get(ID).asString()).setting};
                    }
                }
                return new Setting[0];
            } else {
                Assert.fail("Unknown");
            }
            return null;
        });


        return new BoardConfigurationManagerImpl(activeObjects, issueTypeManager, priorityManager,
                permissionManager, projectManager, globalPermissionManager);
    }

    public static ModelNode loadConfig(String resource) throws IOException {
        InputStream in = BoardConfigurationManagerBuilder.class.getClassLoader().getResourceAsStream(resource);
        Assert.assertNotNull(resource, in);
        try (InputStream bin = new BufferedInputStream(in)){
            return ModelNode.fromJSONStream(bin);
        }
    }

    private static class MockRawEntity implements RawEntity<Integer> {
        @Override
        public void init() {

        }

        @Override
        public void save() {

        }

        @Override
        public EntityManager getEntityManager() {
            return null;
        }

        @Override
        public <X extends RawEntity<Integer>> Class<X> getEntityType() {
            return null;
        }

        @Override
        public void addPropertyChangeListener(PropertyChangeListener listener) {

        }

        @Override
        public void removePropertyChangeListener(PropertyChangeListener listener) {

        }
    }

    private static class MockBoardCfg extends MockRawEntity {
        private final BoardCfg boardCfg = mock(BoardCfg.class);
        private String owningUserKey;
        private ModelNode modelNode;

        public MockBoardCfg(String owningUserKey, ModelNode modelNode) {
            this.owningUserKey = owningUserKey;
            this.modelNode = modelNode;

            when(boardCfg.getName()).thenReturn(modelNode.get(CODE).asString());
            when(boardCfg.getCode()).thenReturn(modelNode.get(NAME).asString());
            when(boardCfg.getConfigJson()).thenReturn(modelNode.toJSONString(true));
            when(boardCfg.getOwningUser()).thenReturn(owningUserKey);
            doAnswer(invocation -> this.modelNode = ModelNode.fromJSONString((String)invocation.getArguments()[0]))
                    .when(boardCfg).setConfigJson(anyString());
            doAnswer(invocation -> this.owningUserKey = (String)invocation.getArguments()[0])
                    .when(boardCfg).setOwningUserKey(anyString());
        }
    }

    private static class MockSetting extends MockRawEntity {
        private final Setting setting = mock(Setting.class);
        private String name;
        private String value;

        public MockSetting(String name, String value) {
            this.name = name;
            this.value = value;

            when(setting.getName()).thenReturn(this.name);
            when(setting.getValue()).thenReturn(this.value);
            doAnswer(invocation -> this.name = (String)invocation.getArguments()[0])
                    .when(setting).setName(anyString());
            doAnswer(invocation -> this.value = (String)invocation.getArguments()[0])
                    .when(setting).setValue(anyString());
        }
    }
}
